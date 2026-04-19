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
import { newIdempotencyKey, runStep } from "../../agent/executor"
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
  /** 流式 delta 事件（runStep 实时推）。UI 按 idempotencyKey 分桶缓存，openclawSessionKey 用于反查发言 agent。 */
  emitStreamDelta: (sessionId: string, idempotencyKey: string, openclawSessionKey: string, content: string) => void
  /** 流式结束（成功 / 失败 / aborted 均触发，兜底清 UI buffer）。 */
  emitStreamEnd: (sessionId: string, idempotencyKey: string, openclawSessionKey: string) => void
  /** 运行错误事件（transient banner，不入 DB）。对齐 openclaw UI lastError 语义。 */
  emitError: (sessionId: string, idempotencyKey: string, openclawSessionKey: string, message: string) => void
  /** 查 agent 的 display name；失败返回 undefined。 */
  resolveAgentDisplayName: (agentId: string) => Promise<string | undefined>
  /** 登记活跃 idempotencyKey（供 abort 查表）。sendToMember 调 runStep 前调用。 */
  trackKeyStart: (sessionId: string, idempotencyKey: string, openclawKey: string) => void
  /** 注销活跃 idempotencyKey。sendToMember 在 runStep 完成/异常后调用。 */
  trackKeyEnd: (sessionId: string, idempotencyKey: string) => void
  /** 从 openclaw chat.history 取该 sessionKey 最后一条 assistant 消息的元数据。失败返 null 不阻塞。 */
  fetchAssistantMeta: (sessionKey: string) => Promise<{
    id?: string
    model?: string
    usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number; total?: number }
    stopReason?: string
  } | null>
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
  if (!session || session.archived) {
    log.warn(`onNewMessage skipped session=${sessionId} not found or archived`)
    return
  }

  const members = listActiveMembers(sessionId)
  let targets = decideTargets(members, msg.mentions, msg.senderType)
  // 剔除 sender 自己：防御性兜底 —— agent 若 @ 自己时 routing 也不转给自己
  if (msg.senderType === "agent" && msg.senderId) {
    targets = targets.filter((t) => t.agentId !== msg.senderId)
  }
  log.info(`onNewMessage session=${sessionId} sender=${msg.senderType} senderId=${msg.senderId ?? "<none>"} members=${members.length} targets=${targets.length}`)

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
    log.warn(`session=${sessionId} budget exceeded, reason=${check.reason} — loop blocked until reset`)
    deps.emitLoop("ended", sessionId, check.reason)
    return
  }

  deps.emitLoop("started", sessionId)
  log.info(
    `onNewMessage about to dispatch ${targets.length} targets: ${JSON.stringify(targets.map((t) => ({ id: t?.id, agentId: t?.agentId, openclawKey: t?.openclawKey, replyMode: t?.replyMode })))}`,
  )

  // 并发给每个 target 发；单个 target 失败不阻塞其他
  const promises = targets.map((t, idx) => {
    log.info(`map callback building promise idx=${idx} targetId=${t?.id}`)
    return (async () => {
      log.info(`map callback body starting idx=${idx} targetId=${t?.id}`)
      try {
        await sendToMember(deps, sessionId, msg, t)
        log.info(`map callback body done idx=${idx}`)
      } catch (err) {
        log.error(`sendToMember threw for target[${idx}]=${t?.id ?? "<undefined>"}: ${(err as Error).message}\n${(err as Error).stack ?? ""}`)
      }
    })()
  })
  log.info(`onNewMessage awaiting Promise.all of ${promises.length} promises`)
  await Promise.all(promises)
  log.info(`onNewMessage Promise.all resolved`)
}

async function sendToMember(deps: GroupDeps, sessionId: string, incoming: ChatMessage, target: ChatMember): Promise<void> {
  log.info(`sendToMember enter member=${target.id} agent=${target.agentId}`)
  const displayName = await deps.resolveAgentDisplayName(target.agentId).catch((err) => {
    log.warn(`resolveAgentDisplayName failed: ${(err as Error).message}`)
    return undefined
  })
  log.info(`sendToMember resolved displayName member=${target.id} name=${displayName ?? "<none>"}`)

  const ctx = buildSharedContext(sessionId, target, {
    agentDisplayName: displayName,
    includeHistory: target.seedHistory || target.joinedAt <= incoming.createdAtLocal,
  })
  log.info(`sendToMember built ctx member=${target.id} ctxKeys=${Object.keys(ctx).join(",")}`)

  try {
    await deps.pushContext(ctx)
    log.info(`sendToMember pushContext ok member=${target.id}`)
  } catch (err) {
    log.warn(`pushContext failed for member=${target.id}: ${(err as Error).message}`)
  }

  const idempotencyKey = newIdempotencyKey()
  const text = extractText(incoming.content)
  log.info(`sendToMember calling runStep member=${target.id} agent=${target.agentId} key=${idempotencyKey} sessionKey=${target.openclawKey} msgLen=${text.length}`)
  deps.trackKeyStart(sessionId, idempotencyKey, target.openclawKey)
  let result
  try {
    result = await runStep(deps.backend, { sessionKey: target.openclawKey, agentId: target.agentId, message: text, idempotencyKey }, (ev) => {
      if (ev.kind === "delta") {
        deps.emitStreamDelta(sessionId, idempotencyKey, target.openclawKey, ev.content)
      }
    })
  } finally {
    deps.trackKeyEnd(sessionId, idempotencyKey)
    deps.emitStreamEnd(sessionId, idempotencyKey, target.openclawKey)
  }
  log.info(`sendToMember done member=${target.id} key=${idempotencyKey} success=${result.success} contentLen=${result.content?.length ?? 0} error=${result.error ?? "none"}`)

  if (!result.success) {
    if (result.error === "aborted") {
      // 对齐 openclaw UI：中断保留 partial 作为 assistant 消息
      const partial = result.content?.trim() ?? ""
      if (partial) {
        const abortedMsg = buildAndInsertAbortedMessage(sessionId, target, result.content, idempotencyKey)
        deps.emitMessage(abortedMsg)
      }
      return
    }
    // 其他错误 → emit chat:error banner，不入 DB（对齐 openclaw UI）
    deps.emitError(sessionId, idempotencyKey, target.openclawKey, result.error ?? "unknown error")
    return
  }

  const interp = interpretReply(result.content)
  if (interp.shouldSuppress) return
  // 空 final 不落库 —— openclaw 偶尔对无实质内容的 turn 返空字符串
  if (!interp.content.trim()) {
    log.info(`sendToMember empty final suppressed member=${target.id} key=${idempotencyKey}`)
    return
  }

  // 从 openclaw chat.history 补元数据（usage / model / stopReason）——event stream 不带这些
  const meta = await deps.fetchAssistantMeta(target.openclawKey).catch(() => null)
  const usage = meta?.usage ?? result.usage ?? null
  const model = meta?.model ?? null
  const stopReason = meta?.stopReason ?? result.stopReason ?? null

  // 把这一轮消耗的 token 累计到 session 预算里；maxTokens 检查在下一轮 checkAndIncrementRound
  const totalTokens = usage?.total ?? (usage?.input ?? 0) + (usage?.output ?? 0)
  if (totalTokens > 0) addTokens(sessionId, totalTokens)

  // 持久化 agent 回复 —— 顺便把此 turn 间累积的 mention_next 事件合并进来
  const assistantMsg: ChatMessage = {
    id: nanoid(),
    sessionId,
    seq: nextSeq(sessionId),
    openclawSessionKey: target.openclawKey,
    openclawMessageId: meta?.id ?? null,
    senderType: "agent",
    senderId: target.agentId,
    role: "assistant",
    content: { text: interp.content },
    mentions: drainPendingMentions(sessionId),
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

  // 递归继续（下一个 target 由 decideTargets 根据新消息的 mentions 决定）
  await onNewMessage(deps, sessionId, assistantMsg)
}

function buildAndInsertAbortedMessage(sessionId: string, target: ChatMember, content: string, idempotencyKey: string): ChatMessage {
  const msg: ChatMessage = {
    id: nanoid(),
    sessionId,
    seq: nextSeq(sessionId),
    openclawSessionKey: target.openclawKey,
    openclawMessageId: null,
    senderType: "agent",
    senderId: target.agentId,
    role: "assistant",
    content: { text: content },
    mentions: [],
    turnRunId: idempotencyKey,
    tags: ["aborted"],
    model: null,
    usage: null,
    stopReason: "aborted",
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
