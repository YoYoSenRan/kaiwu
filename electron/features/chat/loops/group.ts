/**
 * 群聊主 loop（单聊是 N=1 特例，也走这里）。
 *
 * 职责：
 *   1. 接收用户/agent 消息，落库
 *   2. decideTargets 选目标成员
 *   3. 对每个 target：context.set → chat.send → 订阅流式 → 落库 agent 回复 → 递归 loop
 *   4. 预算/终止检查
 *   5. 收到 hand_off / ask_user 工具事件时：更新 mentions 或挂起
 *
 * 依赖注入：backend（调 openclaw）、events（emit 给 renderer）——便于测试替换。
 */

import { nanoid } from "nanoid"
import { scope } from "../../../infra/logger"
import { checkAndIncrementRound, checkStopPhrase } from "./budget"
import { buildSharedContext, type ContextPayload } from "./prompt"
import { interpretReply } from "./interpret"
import { decideTargets, extractCardsFromText, parseMentionsFromText, stripMentionsForAgent } from "../routing"
import { newIdempotencyKey, runStep } from "../../../agent/executor"
import { getMessageById, getSession, insertMessage, insertTurn, listActiveMembers, nextSeq } from "../repository"
import type { ChatBackend } from "../../../agent/executor"
import type { ChatMember, ChatMention, ChatMessage, DeliveryUpdateEvent, LoopEndedReason, LoopPausedEvent } from "../types"

const log = scope("chat:group")

/** 传入的平台能力。 */
export interface GroupDeps {
  backend: ChatBackend
  /** 往 plugin context 域推 sharedHistory。 */
  pushContext: (payload: ContextPayload) => Promise<void>
  /** 发事件给 renderer。 */
  emitMessage: (msg: ChatMessage) => void
  emitLoop: (kind: "started" | "ended", sessionId: string, reason?: LoopEndedReason) => void
  emitPaused: (ev: LoopPausedEvent) => void
  /** 流式 delta 事件（runStep 实时推）。UI 按 idempotencyKey 分桶缓存，openclawSessionKey 用于反查发言 agent。 */
  emitStreamDelta: (sessionId: string, idempotencyKey: string, openclawSessionKey: string, content: string) => void
  /** 流式结束（成功 / 失败 / aborted 均触发，兜底清 UI buffer）。 */
  emitStreamEnd: (sessionId: string, idempotencyKey: string, openclawSessionKey: string) => void
  /**
   * 运行错误事件(transient banner,不入 DB)。对齐 openclaw UI lastError 语义。
   * kind 显式传入:"disconnected"(kaiwu 合成) / "error"(其他) / 龙虾原生 errorKind(timeout/rate_limit/refusal/context_length)。
   */
  emitError: (sessionId: string, idempotencyKey: string, openclawSessionKey: string, message: string, kind?: string) => void
  /** 投递态更新事件（transient）:每 member 对一条触发消息的处理进度。 */
  emitDelivery: (ev: DeliveryUpdateEvent) => void
  /** 查 agent 的 display name；失败返回 undefined。 */
  resolveAgentDisplayName: (agentId: string) => Promise<string | undefined>
  /** 登记活跃 idempotencyKey（供 abort 查表）。sendToMember 调 runStep 前调用。 */
  trackKeyStart: (sessionId: string, idempotencyKey: string, openclawKey: string) => void
  /** 注销活跃 idempotencyKey。sendToMember 在 runStep 完成/异常后调用。 */
  trackKeyEnd: (sessionId: string, idempotencyKey: string) => void
  /**
   * 对刚写入的本地消息做元数据对账:向 openclaw 拉 chat.history,按 content 指纹 + 时间窗口
   * 精确匹配那一条,回填 openclawMessageId / usage / model / stopReason。
   *
   * 内部带重试 + 失败兜底;loop 调用方 fire-and-forget 即可。
   */
  resolveMessageMeta: (params: { sessionId: string; localMsgId: string; sessionKey: string; contentText: string; createdAtLocal: number }) => Promise<void>
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
  // reply-to 隐式路由:user 无显式 @ 但回复了某 agent 消息 → 路由给该 agent
  let replyToAgentId: string | null = null
  if (msg.senderType === "user" && msg.inReplyToMessageId) {
    const parent = getMessageById(msg.inReplyToMessageId)
    if (parent?.senderType === "agent" && parent.senderId) {
      replyToAgentId = parent.senderId
    }
  }
  // agent 消息时,把 senderId(agentId)反查到 member.id 用于 supervisor 判定 + 排除自己
  const senderMemberId = msg.senderType === "agent" && msg.senderId ? (members.find((m) => m.agentId === msg.senderId)?.id ?? null) : null
  const targets = decideTargets({ members, mentions: msg.mentions, senderType: msg.senderType, senderMemberId, replyToAgentId, session })
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

  // delivery 态锁定:必然以 done/error/aborted 之一结束
  // 态源全部来自龙虾 chat event(delta/final/aborted/error)或 runStep 异常,kaiwu 不做自判超时
  let terminalEmitted = false
  const emitTerminal = (status: "done" | "error" | "aborted", errorMsg?: string): void => {
    if (terminalEmitted) return
    terminalEmitted = true
    deps.emitDelivery({ sessionId, anchorMsgId: incoming.id, memberId: target.id, status, errorMsg, at: Date.now() })
  }
  deps.emitDelivery({ sessionId, anchorMsgId: incoming.id, memberId: target.id, status: "queued", at: Date.now() })

  let replyingEmitted = false

  try {
    const displayName = await deps.resolveAgentDisplayName(target.agentId).catch((err) => {
      log.warn(`resolveAgentDisplayName failed: ${(err as Error).message}`)
      return undefined
    })
    log.info(`sendToMember resolved displayName member=${target.id} name=${displayName ?? "<none>"}`)

    // direct 模式不注入 sharedHistory(单聊 openclaw session 自带完整对话历史)。
    // group 模式才需要 plugin context.set 推送群聊感知。
    const session = getSession(sessionId)
    const isGroup = session?.mode === "group"
    const ctx = buildSharedContext(sessionId, target, {
      agentDisplayName: displayName,
      includeHistory: isGroup && (target.seedHistory || target.joinedAt <= incoming.createdAtLocal),
    })
    log.info(`sendToMember built ctx member=${target.id} ctxKeys=${Object.keys(ctx).join(",")}`)

    if (isGroup) {
      try {
        await deps.pushContext(ctx)
        log.info(`sendToMember pushContext ok member=${target.id}`)
      } catch (err) {
        log.warn(`pushContext failed for member=${target.id}: ${(err as Error).message}`)
      }
    }

    const idempotencyKey = newIdempotencyKey()
    // 发给 agent 的文本剥离 @mention 标记:kaiwu routing 已用 mentions 数组分发,不应带到消息体里
    const members = listActiveMembers(sessionId)
    const text = stripMentionsForAgent(extractText(incoming.content), members)
    log.info(`sendToMember calling runStep member=${target.id} agent=${target.agentId} key=${idempotencyKey} sessionKey=${target.openclawKey} msgLen=${text.length}`)

    // 调试追踪:落库本轮完整的 prompt/context 快照
    try {
      insertTurn({
        id: nanoid(),
        sessionId,
        memberId: target.id,
        turnRunId: idempotencyKey,
        sessionKey: target.openclawKey,
        agentId: target.agentId,
        model: null,
        triggerMessageId: incoming.id,
        systemPrompt: ctx.instruction,
        // sharedHistory 现为结构化数组(对齐 discord plugin 格式),落库时 JSON 序列化
        historyText: ctx.sharedHistory ? JSON.stringify(ctx.sharedHistory) : null,
        sentMessage: text,
        sentAt: Date.now(),
      })
    } catch (err) {
      log.warn(`insertTurn failed member=${target.id}: ${(err as Error).message}`)
    }

    deps.trackKeyStart(sessionId, idempotencyKey, target.openclawKey)
    let result
    try {
      result = await runStep(deps.backend, { sessionKey: target.openclawKey, agentId: target.agentId, message: text, idempotencyKey }, (ev) => {
        if (ev.kind === "delta") {
          if (!replyingEmitted) {
            replyingEmitted = true
            deps.emitDelivery({ sessionId, anchorMsgId: incoming.id, memberId: target.id, status: "replying", at: Date.now() })
          }
          deps.emitStreamDelta(sessionId, idempotencyKey, target.openclawKey, ev.content)
        } else if (ev.kind === "reasoning") {
          // 模型在思考(尚未吐字) → thinking;已开始 replying 则不回退
          if (!replyingEmitted) {
            deps.emitDelivery({ sessionId, anchorMsgId: incoming.id, memberId: target.id, status: "thinking", at: Date.now() })
          }
        } else if (ev.kind === "tool") {
          if (ev.phase === "start") {
            deps.emitDelivery({ sessionId, anchorMsgId: incoming.id, memberId: target.id, status: "tool", toolName: ev.name, at: Date.now() })
          } else {
            // tool 结束:若尚未开始吐字 → 回 thinking;已开始 → 回 replying
            deps.emitDelivery({
              sessionId,
              anchorMsgId: incoming.id,
              memberId: target.id,
              status: replyingEmitted ? "replying" : "thinking",
              at: Date.now(),
            })
          }
        }
        // lifecycle 事件暂不转为 delivery 态(queued 已在入口 emit;首 delta 转 replying)
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
          const abortedMsg = buildAndInsertAbortedMessage(sessionId, target, result.content, idempotencyKey, incoming.id)
          deps.emitMessage(abortedMsg)
        }
        emitTerminal("aborted")
        return
      }
      // 其他错误 → emit chat:error banner，不入 DB（对齐 openclaw UI）
      deps.emitError(sessionId, idempotencyKey, target.openclawKey, result.error ?? "unknown error", result.errorKind)
      emitTerminal("error", result.error ?? "unknown error")
      return
    }

    const interp = interpretReply(result.content)
    if (interp.shouldSuppress) {
      emitTerminal("done")
      return
    }
    // 空 final 不落库 —— openclaw 偶尔对无实质内容的 turn 返空字符串
    if (!interp.content.trim()) {
      log.info(`sendToMember empty final suppressed member=${target.id} key=${idempotencyKey}`)
      emitTerminal("done")
      return
    }

    // live 阶段只用 stream fallback;权威元数据(usage / model / stopReason / openclawMessageId)
    // 交给 resolveMessageMeta 异步对账回填。
    const usage = result.usage ?? null
    const stopReason = result.stopReason ?? null

    // 存两类 mention(UI 展示 + 路由区分都靠 source 字段):
    //   - tool 事件(hand_off 工具触发) → source="tool" → 参与路由(确定意图)
    //   - 正文 @<agentId>                  → source="plain" → 仅 UI 展示,不参与路由(见 routing.ts)
    //   排除 sender 自己,防 agent @ 自己导致 onNewMessage 路由回自己
    const activeMembers = listActiveMembers(sessionId)
    const toolMentions = drainPendingMentions(sessionId)
    const textMentions = parseMentionsFromText(interp.content, activeMembers, target.agentId)
    const seenAgentIds = new Set<string>()
    const mergedMentions: ChatMention[] = []
    for (const m of [...toolMentions, ...textMentions]) {
      if (seenAgentIds.has(m.agentId)) continue
      seenAgentIds.add(m.agentId)
      mergedMentions.push(m)
    }

    const content = (() => {
      const extracted = extractCardsFromText(interp.content)
      return extracted.cards.length > 0 ? { text: extracted.text, cards: extracted.cards } : { text: interp.content }
    })()
    const assistantMsg: ChatMessage = {
      id: nanoid(),
      sessionId,
      seq: nextSeq(sessionId),
      openclawSessionKey: target.openclawKey,
      openclawMessageId: null,
      senderType: "agent",
      senderId: target.agentId,
      role: "assistant",
      content,
      mentions: mergedMentions,
      inReplyToMessageId: incoming.id,
      turnRunId: idempotencyKey,
      tags: [],
      model: null,
      usage,
      stopReason,
      createdAtLocal: Date.now(),
      createdAtRemote: null,
    }
    insertMessage(assistantMsg)
    deps.emitMessage(assistantMsg)
    // 异步对账:向 openclaw chat.history 拉权威元数据回填
    void deps.resolveMessageMeta({
      sessionId,
      localMsgId: assistantMsg.id,
      sessionKey: target.openclawKey,
      contentText: content.text,
      createdAtLocal: assistantMsg.createdAtLocal,
    })
    emitTerminal("done")

    // 递归继续（下一个 target 由 decideTargets 根据新消息的 mentions 决定）
    await onNewMessage(deps, sessionId, assistantMsg)
  } catch (err) {
    emitTerminal("error", (err as Error).message)
    throw err
  } finally {
    if (!terminalEmitted) emitTerminal("error", "unknown termination")
  }
}

function buildAndInsertAbortedMessage(sessionId: string, target: ChatMember, content: string, idempotencyKey: string, inReplyToMessageId: string | null): ChatMessage {
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
    inReplyToMessageId,
    turnRunId: idempotencyKey,
    tags: ["aborted"],
    model: null,
    usage: null,
    stopReason: "aborted",
    createdAtLocal: Date.now(),
    createdAtRemote: null,
  }
  insertMessage(msg)
  return msg
}

/** 收到 plugin 推的 hand_off 事件 —— 积攒到桶里,assistant 落库时被 drain。 */
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
