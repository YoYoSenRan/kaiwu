/**
 * 对账子域:openclaw chat.history 是真相源,kaiwu DB 做缓存。
 *
 * 三个入口:
 *   - reconcileSession  全 session 对账(切 session、loop ended、startup 触发)
 *   - resolveMessageMeta 单条消息对账 + 重试(stream final 后立刻 fire-and-forget)
 *   - handleExternalFinal openclaw 主动 final 但 kaiwu 没 listener(旁路 / 重启)→ 转 reconcileSession
 *
 * reconcileMember 是公共底座:单 member 拉 history → 逐条 upsert 或 insert 孤儿。
 */

import { nanoid } from "nanoid"
import { scope } from "../../infra/logger"
import { getGateway } from "../openclaw/runtime"
import { getSession, insertMessage, listMembers, listMessages, listSessions, nextSeq, updateMessageMeta } from "./repository"
import type { ChatMember, ChatMessage, MessageUsage } from "./types"

const log = scope("chat:reconcile")

/** Anthropic/Gateway 正常结束的 stopReason。非此集合的 assistant 消息视为工具调用中间步骤,不对账。 */
const NORMAL_STOP: ReadonlySet<string> = new Set(["stop", "end_turn", "stop_sequence"])

// ────────────────────────────────────────────────────────────────────
// 匹配:openclaw history 消息 ↔ kaiwu 本地消息
// ────────────────────────────────────────────────────────────────────

/** openclaw chat.history messages[] 单条形状(只列本模块用到的字段)。 */
export interface OpenclawHistoryMessage {
  role: string
  content?: string
  model?: string
  stopReason?: string
  timestamp?: number
  usage?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    total?: number
  }
  __openclaw?: { id?: string }
}

/** 匹配候选:来自 kaiwu 本地 DB 的 agent 消息线索。 */
export interface LocalMessageClue {
  openclawMessageId: string | null
  contentText: string
  createdAtLocal: number
}

const TIME_WINDOW_MS = 60_000
const FINGERPRINT_LEN = 200

function trim200(text: string): string {
  return text.trim().slice(0, FINGERPRINT_LEN)
}

/**
 * 反向版本:reconcile 视角,以 openclaw 一条为输入,在本地查匹配。
 * 优先 openclawMessageId 精确匹配;否则同 sessionKey + senderType=agent + 内容子串双向 + 时间窗 ±60s。
 * "子串双向":live msg 可能合并 tool 输出 + final,openclaw final 只是末段。
 */
export function findLocalMatchForRemote<
  L extends { id: string; openclawMessageId: string | null; openclawSessionKey: string | null; senderType: string; content: unknown; createdAtLocal: number },
>(remote: OpenclawHistoryMessage, sessionKey: string, locals: L[], index?: Map<string, L>): L | null {
  const strongId = remote.__openclaw?.id ?? null
  if (strongId) {
    const byId = index?.get(strongId) ?? locals.find((l) => l.openclawMessageId === strongId)
    if (byId) return byId
  }
  const fp = trim200((remote.content as string | undefined) ?? "")
  if (!fp) return null
  const ts = remote.timestamp ?? 0
  return (
    locals.find((l) => {
      if (l.openclawSessionKey !== sessionKey) return false
      if (l.senderType !== "agent") return false
      const lText = trim200((l.content as { text?: string } | null)?.text ?? "")
      if (!lText) return false
      if (!lText.includes(fp) && !fp.includes(lText)) return false
      if (ts > 0 && Math.abs(l.createdAtLocal - ts) > TIME_WINDOW_MS) return false
      return true
    }) ?? null
  )
}

/**
 * 正向版本:resolveMessageMeta 视角,以本地 live 消息为输入,去 openclaw history 查。
 * 优先 id 精确匹配;否则 content 子串 + 时间窗 + assistant 角色。
 */
export function matchOpenclawMessage(local: LocalMessageClue, history: OpenclawHistoryMessage[]): OpenclawHistoryMessage | null {
  if (local.openclawMessageId) {
    const byId = history.find((m) => m.__openclaw?.id === local.openclawMessageId)
    if (byId) return byId
  }
  const fp = trim200(local.contentText)
  if (!fp) return null
  const lo = local.createdAtLocal - TIME_WINDOW_MS
  const hi = local.createdAtLocal + TIME_WINDOW_MS
  return (
    history.find((m) => {
      if (m.role !== "assistant") return false
      const mText = trim200(m.content ?? "")
      if (!mText) return false
      if (!mText.includes(fp) && !fp.includes(mText)) return false
      if (m.timestamp != null && (m.timestamp < lo || m.timestamp > hi)) return false
      return true
    }) ?? null
  )
}

/** 把 openclaw usage 对象规范化为 kaiwu MessageUsage 形状。 */
export function normalizeUsage(u: OpenclawHistoryMessage["usage"] | undefined): MessageUsage | null {
  if (!u) return null
  return {
    input: u.input,
    output: u.output,
    cacheRead: u.cacheRead,
    cacheWrite: u.cacheWrite,
    total: u.total ?? u.totalTokens,
  }
}

// ────────────────────────────────────────────────────────────────────
// 对账:三入口共享 reconcileMember 底座
// ────────────────────────────────────────────────────────────────────

/** 给 service 用的 emit 钩子(避免直接依赖 ChatService 类型循环)。 */
export interface ReconcileEmitter {
  emitMessagesRefresh(sessionId: string, reason: "reconcile" | "external" | "meta"): void
}

/** chat.history RPC 返回结构(messages 字段)。 */
async function fetchHistory(sessionKey: string): Promise<OpenclawHistoryMessage[] | null> {
  try {
    const resp = await Promise.race([
      getGateway().call<{ messages?: OpenclawHistoryMessage[] }>("chat.history", { sessionKey }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("chat.history timeout 10s")), 10_000)),
    ])
    return Array.isArray(resp?.messages) ? resp.messages : null
  } catch (err) {
    log.warn(`fetchHistory sessionKey=${sessionKey} failed: ${(err as Error).message}`)
    return null
  }
}

/** 从 chat.history 返回的 content 字段提取纯文本。 */
function extractHistoryText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && typeof b === "object" && "type" in (b as object) && (b as { type: string }).type === "text")
      .map((b) => (b as { text?: string }).text ?? "")
      .join("")
  }
  if (content && typeof content === "object") {
    const c = content as { text?: string }
    if (typeof c.text === "string") return c.text
  }
  return ""
}

/**
 * 单 member 对账:对一个 member 的 openclaw history 逐条 upsert 或 insert 孤儿。
 * cache 由调用方提供,允许跨 member 共享 local index 减少重复加载。
 */
async function reconcileMember(
  sessionId: string,
  member: ChatMember,
  cache: { localMessages: ChatMessage[]; localByOpenclawId: Map<string, ChatMessage> },
): Promise<{ imported: number; updated: number }> {
  const sessionKey = member.openclawKey
  const messages = await fetchHistory(sessionKey)
  if (!messages) return { imported: 0, updated: 0 }
  let imported = 0
  let updated = 0
  const sorted = [...messages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
  for (const r of sorted) {
    if (r.role !== "assistant") continue
    if (r.stopReason && !NORMAL_STOP.has(r.stopReason)) continue

    const localMatch = findLocalMatchForRemote(r, sessionKey, cache.localMessages, cache.localByOpenclawId)
    if (!localMatch) {
      const contentText = extractHistoryText(r.content)
      const strongId = r.__openclaw?.id ?? null
      const newMsg: ChatMessage = {
        id: nanoid(),
        sessionId,
        seq: nextSeq(sessionId),
        openclawSessionKey: sessionKey,
        openclawMessageId: strongId,
        senderType: "agent",
        senderId: member.agentId,
        role: "assistant",
        content: { text: contentText },
        mentions: [],
        inReplyToMessageId: null,
        turnRunId: null,
        tags: ["synced"],
        model: r.model ?? null,
        usage: normalizeUsage(r.usage),
        stopReason: r.stopReason ?? null,
        createdAtLocal: Date.now(),
        createdAtRemote: r.timestamp ?? null,
      }
      insertMessage(newMsg)
      cache.localMessages.push(newMsg)
      if (strongId) cache.localByOpenclawId.set(strongId, newMsg)
      imported++
      log.info(`reconcile inserted orphan sessionKey=${sessionKey} fp=${contentText.slice(0, 40)}`)
      continue
    }

    const nextUsage = normalizeUsage(r.usage)
    const nextModel = r.model ?? null
    const nextStopReason = r.stopReason ?? null
    const nextOpenclawId = r.__openclaw?.id ?? null
    const needUpdate =
      (nextOpenclawId && nextOpenclawId !== localMatch.openclawMessageId) ||
      (nextUsage && JSON.stringify(nextUsage) !== JSON.stringify(localMatch.usage)) ||
      (nextModel && nextModel !== localMatch.model) ||
      (nextStopReason && nextStopReason !== localMatch.stopReason)
    if (needUpdate) {
      updateMessageMeta(localMatch.id, {
        openclawMessageId: nextOpenclawId ?? undefined,
        usage: nextUsage ?? undefined,
        model: nextModel ?? undefined,
        stopReason: nextStopReason ?? undefined,
      })
      updated++
    }
  }
  return { imported, updated }
}

export async function reconcileSession(sessionId: string): Promise<{ imported: number; updated: number }> {
  const session = getSession(sessionId)
  if (!session) return { imported: 0, updated: 0 }
  const members = listMembers(sessionId)
  if (members.length === 0) return { imported: 0, updated: 0 }
  if (getGateway().getState().status !== "connected") return { imported: 0, updated: 0 }

  const localMessages = listMessages(sessionId)
  const localByOpenclawId = new Map<string, ChatMessage>()
  for (const m of localMessages) {
    if (m.openclawMessageId) localByOpenclawId.set(m.openclawMessageId, m)
  }
  const cache = { localMessages, localByOpenclawId }
  let imported = 0
  let updated = 0
  for (const member of members) {
    const r = await reconcileMember(sessionId, member, cache)
    imported += r.imported
    updated += r.updated
  }
  if (imported > 0 || updated > 0) log.info(`reconcile session=${sessionId} imported=${imported} updated=${updated}`)
  return { imported, updated }
}

/** stream final 后立刻调,带 200/500/1000ms 重试,匹配到就 upsert + emit refresh。 */
export async function resolveMessageMeta(
  emitter: ReconcileEmitter,
  params: { sessionId: string; localMsgId: string; sessionKey: string; contentText: string; createdAtLocal: number },
): Promise<void> {
  const delays = [200, 500, 1000]
  for (const delay of delays) {
    await new Promise<void>((r) => setTimeout(r, delay))
    if (getGateway().getState().status !== "connected") continue
    const history = await fetchHistory(params.sessionKey)
    if (!history || history.length === 0) continue
    const matched = matchOpenclawMessage({ openclawMessageId: null, contentText: params.contentText, createdAtLocal: params.createdAtLocal }, history)
    if (!matched) continue
    updateMessageMeta(params.localMsgId, {
      openclawMessageId: matched.__openclaw?.id ?? null,
      usage: normalizeUsage(matched.usage),
      model: matched.model ?? null,
      stopReason: matched.stopReason ?? null,
    })
    emitter.emitMessagesRefresh(params.sessionId, "meta")
    return
  }
  log.warn(`resolveMessageMeta exhausted localMsgId=${params.localMsgId} sessionKey=${params.sessionKey}`)
}

/** openclaw 的 final 事件没找到 kaiwu listener(旁路写入 / 重启)→ 触发整 session 对账。 */
export async function handleExternalFinal(emitter: ReconcileEmitter, member: ChatMember): Promise<void> {
  const r = await reconcileSession(member.sessionId)
  if (r.imported > 0 || r.updated > 0) emitter.emitMessagesRefresh(member.sessionId, "external")
}

/** 启动时遍历所有未归档 session 跑一次对账(等 gateway connected)。 */
export async function reconcileAllOnStartup(): Promise<void> {
  for (let i = 0; i < 300; i++) {
    if (getGateway().getState().status === "connected") break
    await new Promise((r) => setTimeout(r, 100))
  }
  const sessions = listSessions().filter((s) => !s.archived)
  for (const s of sessions) {
    try {
      await reconcileSession(s.id)
    } catch (err) {
      log.warn(`startup reconcile session=${s.id} failed: ${(err as Error).message}`)
    }
  }
}
