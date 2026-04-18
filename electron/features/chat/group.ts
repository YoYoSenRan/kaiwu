/**
 * 群聊主 loop（单聊是 N=1 特例，也走这里）。
 *
 * 职责：
 *   1. 接收用户/agent 消息，落库
 *   2. decideTargets 选目标成员
 *   3. 对每个 target：context.set → chat.send → 订阅流式 → 落库 agent 回复 → 递归 loop
 *   4. 预算/终止检查
 *   5. 收到 mention_next / ask_user 工具事件时：更新 mentions 或挂起
 *
 * 依赖注入：backend（调 openclaw）、events（emit 给 renderer）——便于测试替换。
 */

import { nanoid } from "nanoid"
import { scope } from "../../infra/logger"
import { addTokens, checkAndIncrementRound, checkStopPhrase } from "./budget"
import { buildSharedContext } from "./context"
import { interpretReply } from "./interpret"
import { newRunId, runStep } from "../../agent/executor"
import { decideTargets } from "./routing"
import { getSession, insertMessage, listActiveMembers, nextSeq } from "./repository"
import type { ChatBackend } from "../../agent/executor"
import type { ChatMember, ChatMention, ChatMessage, LoopEndedReason, LoopPausedEvent } from "./types"

const log = scope("chat:group")

/** 传入的平台能力。 */
export interface GroupDeps {
  backend: ChatBackend
  /** 往 plugin context 域推 sharedHistory。 */
  pushContext: (payload: { sessionKey: string; instruction: string; knowledge: string[]; sharedHistory?: string }) => Promise<void>
  /** 发事件给 renderer。 */
  emitMessage: (msg: ChatMessage) => void
  emitLoop: (kind: "started" | "ended", sessionId: string, reason?: LoopEndedReason) => void
  emitPaused: (ev: LoopPausedEvent) => void
  /** 查 agent 的 display name；失败返回 undefined。 */
  resolveAgentDisplayName: (agentId: string) => Promise<string | undefined>
}

/** 挂起状态登记：pendingId → { sessionId, byAgentId }。用于 answerAsk 回写。 */
const pending = new Map<string, { sessionId: string; byAgentId: string }>()

export function hasPending(pendingId: string): boolean {
  return pending.has(pendingId)
}

export function takePending(pendingId: string): { sessionId: string; byAgentId: string } | null {
  const v = pending.get(pendingId) ?? null
  if (v) pending.delete(pendingId)
  return v
}

/** pending mentions 桶（扩展点缩水版：MVP 不按 runId 精确对应，按 session 聚合）。 */
const pendingMentions = new Map<string, ChatMention[]>()

export function drainPendingMentions(sessionId: string): ChatMention[] {
  const bucket = pendingMentions.get(sessionId) ?? []
  pendingMentions.delete(sessionId)
  return bucket
}

/**
 * 处理一条新消息（来自 user 或 agent），触发本轮广播 + 递归推进。
 */
export async function onNewMessage(deps: GroupDeps, sessionId: string, msg: ChatMessage): Promise<void> {
  const session = getSession(sessionId)
  if (!session || session.archived) return

  const members = listActiveMembers(sessionId)
  const targets = decideTargets(members, msg.mentions)

  if (targets.length === 0) {
    log.debug(`no targets for session=${sessionId}, loop ended`)
    deps.emitLoop("ended", sessionId, "no_target")
    return
  }

  // stop_phrase 检查：agent 回复匹配则终止
  if (msg.senderType === "agent" && checkStopPhrase(extractText(msg.content), session.budget)) {
    deps.emitLoop("ended", sessionId, "stop_phrase")
    return
  }

  // 预算检查（每次广播前 +1 轮）
  const check = checkAndIncrementRound(sessionId, session.budget)
  if (check.exceeded) {
    deps.emitLoop("ended", sessionId, check.reason)
    return
  }

  deps.emitLoop("started", sessionId)

  // 并发给每个 target 发
  await Promise.all(targets.map((t) => sendToMember(deps, sessionId, msg, t)))
}

async function sendToMember(deps: GroupDeps, sessionId: string, incoming: ChatMessage, target: ChatMember): Promise<void> {
  const displayName = await deps.resolveAgentDisplayName(target.agentId)
  const ctx = buildSharedContext(sessionId, target, {
    agentDisplayName: displayName,
    includeHistory: target.seedHistory || target.joinedAt <= incoming.createdAtLocal,
  })

  try {
    await deps.pushContext(ctx)
  } catch (err) {
    log.warn(`pushContext failed for member=${target.id}: ${(err as Error).message}`)
  }

  const runId = newRunId()
  const text = extractText(incoming.content)
  const result = await runStep(deps.backend, { sessionKey: target.openclawKey, agentId: target.agentId, message: text, runId })
  if (!result.success) {
    log.warn(`step failed for ${target.id}: ${result.error}`)
    return
  }

  // 把这一轮消耗的 token 累计到 session 预算里；maxTokens 检查在下一轮 checkAndIncrementRound
  const totalTokens = result.usage?.total ?? (result.usage?.input ?? 0) + (result.usage?.output ?? 0)
  if (totalTokens > 0) addTokens(sessionId, totalTokens)

  const interp = interpretReply(result.content)
  if (interp.shouldSuppress) return

  // 持久化 agent 回复 —— 顺便把此 turn 间累积的 mention_next 事件合并进来
  const assistantMsg: ChatMessage = {
    id: nanoid(),
    sessionId,
    seq: nextSeq(sessionId),
    openclawSessionKey: target.openclawKey,
    openclawMessageId: null,
    senderType: "agent",
    senderId: target.agentId,
    role: "assistant",
    content: { text: interp.content },
    mentions: drainPendingMentions(sessionId),
    turnRunId: runId,
    tags: [],
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
    createdAtRemote: assistantMsg.createdAtRemote,
  })
  deps.emitMessage(assistantMsg)

  // 递归继续（下一个 target 由 decideTargets 根据新消息的 mentions 决定）
  await onNewMessage(deps, sessionId, assistantMsg)
}

/** 收到 plugin 推的 mention_next 事件 —— 积攒到桶里，assistant 落库时被 drain。 */
export function onMentionNextEvent(_deps: GroupDeps, sessionId: string, ev: { agentId: string }): void {
  const bucket = pendingMentions.get(sessionId) ?? []
  bucket.push({ agentId: ev.agentId, source: "tool" })
  pendingMentions.set(sessionId, bucket)
}

/** 收到 ask_user 事件 —— 挂起 loop，通知 UI。 */
export function onAskUserEvent(deps: GroupDeps, sessionId: string, ev: { byAgentId: string; question: string; options?: string[] }): void {
  const pendingId = nanoid()
  pending.set(pendingId, { sessionId, byAgentId: ev.byAgentId })
  deps.emitPaused({ sessionId, kind: "ask_user", pendingId, question: ev.question, options: ev.options, byAgentId: ev.byAgentId })
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (content && typeof content === "object") {
    const c = content as { text?: string }
    if (typeof c.text === "string") return c.text
  }
  return ""
}
