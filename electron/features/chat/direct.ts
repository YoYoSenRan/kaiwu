/**
 * 单聊（direct）loop。
 *
 * 与 group 拆分的理由：
 *   - direct 只有 1 个 agent，不需要 decideTargets / mention / fan-out / 递归
 *   - 流程线性：user 发 → chat.send → 流式订阅 → final → 落库 → 等下一个 user 输入
 *   - 失败一侧落库 error 消息（参考 openclaw 官方 UI），空 final 不落库
 *
 * 流式：delta 事件通过 deps.emitStreamDelta 推 renderer，end 时 emitStreamEnd 清 UI buffer。
 */

import { nanoid } from "nanoid"
import { scope } from "../../infra/logger"
import { addTokens, checkAndIncrementRound } from "./budget"
import { interpretReply } from "./interpret"
import { newIdempotencyKey, runStep } from "../../agent/executor"
import { getSession, insertMessage, listActiveMembers, nextSeq } from "./repository"
import type { ChatBackend } from "../../agent/executor"
import type { ChatMember, ChatMessage, LoopEndedReason } from "./types"

const log = scope("chat:direct")

export interface DirectDeps {
  backend: ChatBackend
  emitMessage: (msg: ChatMessage) => void
  emitLoop: (kind: "started" | "ended", sessionId: string, reason?: LoopEndedReason) => void
  emitStreamDelta: (sessionId: string, idempotencyKey: string, openclawSessionKey: string, content: string) => void
  emitStreamEnd: (sessionId: string, idempotencyKey: string, openclawSessionKey: string) => void
  trackKeyStart: (sessionId: string, idempotencyKey: string, openclawKey: string) => void
  trackKeyEnd: (sessionId: string, idempotencyKey: string) => void
  /** 从 openclaw chat.history 取该 sessionKey 最后一条 assistant 消息的元数据。失败返 null 不阻塞。 */
  fetchAssistantMeta: (
    sessionKey: string,
  ) => Promise<{ model?: string; usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number; total?: number }; stopReason?: string } | null>
}

/**
 * 处理一条 user 消息：发到唯一成员 → 订阅流式 → 落库 assistant 回复。
 * 不递归：single-turn 结束即退出，等下一次 user 输入。
 */
export async function sendDirect(deps: DirectDeps, sessionId: string, userMsg: ChatMessage): Promise<void> {
  const session = getSession(sessionId)
  if (!session || session.archived) {
    log.warn(`sendDirect skipped session=${sessionId} not found or archived`)
    return
  }
  if (session.mode !== "direct") {
    log.warn(`sendDirect called on non-direct session=${sessionId} mode=${session.mode}`)
    return
  }

  const members = listActiveMembers(sessionId)
  const member = members[0]
  if (!member) {
    log.warn(`sendDirect no active member session=${sessionId}`)
    deps.emitLoop("ended", sessionId, "no_target")
    return
  }

  // 预算检查（direct 也记一轮）
  const check = checkAndIncrementRound(sessionId, session.budget)
  if (check.exceeded) {
    log.warn(`session=${sessionId} budget exceeded, reason=${check.reason}`)
    deps.emitLoop("ended", sessionId, check.reason)
    return
  }

  deps.emitLoop("started", sessionId)
  const idempotencyKey = newIdempotencyKey()
  const text = extractText(userMsg.content)
  log.info(`sendDirect start session=${sessionId} agent=${member.agentId} key=${idempotencyKey} sessionKey=${member.openclawKey} msgLen=${text.length}`)

  deps.trackKeyStart(sessionId, idempotencyKey, member.openclawKey)

  try {
    const result = await runStep(deps.backend, { sessionKey: member.openclawKey, agentId: member.agentId, message: text, idempotencyKey }, (ev) => {
      if (ev.kind === "delta") {
        deps.emitStreamDelta(sessionId, idempotencyKey, member.openclawKey, ev.content)
      }
    })

    log.info(`sendDirect done session=${sessionId} key=${idempotencyKey} success=${result.success} contentLen=${result.content?.length ?? 0}`)

    if (!result.success) {
      if (result.error === "aborted") {
        // 中断不落库；UI 靠 stream:end + 已展示的 user 消息即可
        return
      }
      // 其他错误 → 落一条错误提示消息
      const errMsg = buildAndInsertErrorMessage(sessionId, member, result.error ?? "unknown error", idempotencyKey)
      deps.emitMessage(errMsg)
      return
    }

    const interp = interpretReply(result.content)
    if (interp.shouldSuppress) return
    if (!interp.content.trim()) {
      log.info(`sendDirect empty final suppressed session=${sessionId} key=${idempotencyKey}`)
      return
    }

    // 从 openclaw chat.history 补元数据（usage / model / stopReason）——event stream 不带这些
    const meta = await deps.fetchAssistantMeta(member.openclawKey).catch(() => null)
    const usage = meta?.usage ?? result.usage ?? null
    const model = meta?.model ?? null
    const stopReason = meta?.stopReason ?? result.stopReason ?? null

    const totalTokens = usage?.total ?? (usage?.input ?? 0) + (usage?.output ?? 0)
    if (totalTokens > 0) addTokens(sessionId, totalTokens)

    const assistantMsg: ChatMessage = {
      id: nanoid(),
      sessionId,
      seq: nextSeq(sessionId),
      openclawSessionKey: member.openclawKey,
      openclawMessageId: null,
      senderType: "agent",
      senderId: member.agentId,
      role: "assistant",
      content: { text: interp.content },
      mentions: [],
      turnRunId: idempotencyKey,
      tags: [],
      model,
      usage,
      stopReason,
      createdAtLocal: Date.now(),
      createdAtRemote: null,
    }
    insertMessage({
      id: assistantMsg.id,
      sessionId: assistantMsg.sessionId,
      seq: assistantMsg.seq,
      openclawSessionKey: assistantMsg.openclawSessionKey,
      openclawMessageId: assistantMsg.openclawMessageId,
      senderType: assistantMsg.senderType,
      senderId: assistantMsg.senderId,
      role: assistantMsg.role,
      content: assistantMsg.content,
      mentions: assistantMsg.mentions,
      turnRunId: assistantMsg.turnRunId,
      tags: assistantMsg.tags,
      model: assistantMsg.model,
      usage: assistantMsg.usage,
      stopReason: assistantMsg.stopReason,
      createdAtRemote: assistantMsg.createdAtRemote,
    })
    deps.emitMessage(assistantMsg)
  } finally {
    deps.trackKeyEnd(sessionId, idempotencyKey)
    deps.emitStreamEnd(sessionId, idempotencyKey, member.openclawKey)
    deps.emitLoop("ended", sessionId)
  }
}

function buildAndInsertErrorMessage(sessionId: string, member: ChatMember, error: string, idempotencyKey: string): ChatMessage {
  const msg: ChatMessage = {
    id: nanoid(),
    sessionId,
    seq: nextSeq(sessionId),
    openclawSessionKey: member.openclawKey,
    openclawMessageId: null,
    senderType: "system",
    senderId: null,
    role: "system",
    content: { text: `[error] ${error}` },
    mentions: [],
    turnRunId: idempotencyKey,
    tags: ["error"],
    model: null,
    usage: null,
    stopReason: null,
    createdAtLocal: Date.now(),
    createdAtRemote: null,
  }
  insertMessage({
    id: msg.id,
    sessionId: msg.sessionId,
    seq: msg.seq,
    openclawSessionKey: msg.openclawSessionKey,
    openclawMessageId: msg.openclawMessageId,
    senderType: msg.senderType,
    senderId: msg.senderId,
    role: msg.role,
    content: msg.content,
    mentions: msg.mentions,
    turnRunId: msg.turnRunId,
    tags: msg.tags,
    model: msg.model,
    usage: msg.usage,
    stopReason: msg.stopReason,
    createdAtRemote: msg.createdAtRemote,
  })
  return msg
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (content && typeof content === "object") {
    const c = content as { text?: string }
    if (typeof c.text === "string") return c.text
  }
  return ""
}
