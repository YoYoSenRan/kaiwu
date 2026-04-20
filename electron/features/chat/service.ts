/**
 * chat feature 的 IpcController。
 *
 * 本类只负责:
 *   - 生命周期 (onReady / onShutdown)
 *   - 共享 state (deps / directDeps / listenersByKey / active runs / gateway subscriptions)
 *   - @Handle 装饰器 + 1 行 delegate 到 ipc/<prefix>.ts
 *   - gateway/plugin 事件订阅 (private 方法,后续可抽到 events/)
 *
 * 所有 IPC 处理逻辑拆到 `ipc/*.ts` 按前缀分组。
 */

import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import { scope } from "../../infra/logger"
import type { ChatBackend } from "../../agent/executor"
import type { StepEvent, StepUsage } from "../../agent/types"
import { onAskUserEvent, onMentionNextEvent, type DirectDeps, type GroupDeps } from "./loops"
import type { ContextPayload } from "./loops/prompt"
import { parseOpenClawKey } from "./bootstrap"
import { listMembers, listMessages, listSessions, getSession, updateMessageMeta } from "./repository"
import { matchOpenclawMessage, normalizeUsage, type OpenclawHistoryMessage } from "./usage-match"
import { getBridgeServer, getGateway } from "../openclaw/runtime"
import { call as invokePluginBridge } from "../openclaw/bridge/call"
import type { EventFrame } from "../openclaw/gateway/contract"
import type { PluginEvent } from "../openclaw/contracts/plugin"
import * as sessionIpc from "./ipc/session"
import * as messageIpc from "./ipc/message"
import * as memberIpc from "./ipc/member"
import * as budgetIpc from "./ipc/budget"
import * as usageIpc from "./ipc/usage"
import * as inspectIpc from "./ipc/inspect"
import * as debugIpc from "./ipc/debug"
import type {
  AddMemberInput,
  AnswerAskInput,
  BudgetState,
  ChatBridge,
  ChatEvents,
  ChatMember,
  ChatMention,
  ChatMessage,
  ChatSessionDetail,
  ChatTurn,
  CreateSessionInput,
  DeliveryUpdateEvent,
  MemberPatch,
  SessionUsage,
} from "./types"

const log = scope("chat:service")

/** Anthropic/Gateway 正常结束的 stopReason。非此集合的 assistant 消息视为工具调用中间步骤,不对账。 */
const NORMAL_STOP: ReadonlySet<string> = new Set(["stop", "end_turn", "stop_sequence"])

interface ChatEventPayload {
  runId?: string
  sessionKey?: string
  state?: "delta" | "final" | "aborted" | "error"
  message?: { content?: Array<{ type: string; text?: string }> }
  stopReason?: string
  usage?: Record<string, number>
  errorMessage?: string
  errorKind?: string
}

@Controller("chat")
export class ChatService extends IpcController<ChatEvents> implements IpcLifecycle {
  // ---------- 共享 state (ipc/ 访问) ----------
  public deps: GroupDeps | null = null
  public directDeps: DirectDeps | null = null
  public readonly activeKeysBySession = new Map<string, Set<string>>()
  public readonly sessionKeyByKey = new Map<string, string>()

  // ---------- 内部 state ----------
  private readonly listenersByKey = new Map<string, (ev: StepEvent) => void>()
  private offGatewayEvents: (() => void) | null = null
  private offAgentEvents: (() => void) | null = null
  private offPluginEvents: (() => void) | null = null
  private connectionWatchdog: ReturnType<typeof setInterval> | null = null
  private lastGatewayConnected = true

  // ---------- 生命周期 ----------

  async onReady(): Promise<void> {
    void this.pollAndSubscribeGatewayChatEvents()
    this.subscribePluginChatEvents()

    this.deps = {
      backend: this.buildBackend(),
      pushContext: (payload) => this.pushContext(payload),
      emitMessage: (msg) => this.emit("message:new", msg),
      emitLoop: (kind, sessionId, reason) => {
        this.emit("loop:event", { sessionId, kind, reason })
        // loop 结束时后台再跑一次全量对账,兜底 resolveMessageMeta 没拿到的消息。
        if (kind === "ended") {
          void this.reconcileSession(sessionId)
            .then((r) => {
              if (r.imported > 0 || r.updated > 0) this.emit("messages:refresh", { sessionId, reason: "reconcile" })
            })
            .catch(() => {})
        }
      },
      emitPaused: (ev) => this.emit("loop:paused", ev),
      emitStreamDelta: (sessionId, idempotencyKey, openclawSessionKey, content) => this.emit("stream:delta", { sessionId, idempotencyKey, openclawSessionKey, content }),
      emitStreamEnd: (sessionId, idempotencyKey, openclawSessionKey) => this.emit("stream:end", { sessionId, idempotencyKey, openclawSessionKey }),
      emitError: (sessionId, idempotencyKey, openclawSessionKey, message, kind) => {
        this.emit("chat:error", { sessionId, idempotencyKey, openclawSessionKey, message, kind: kind ?? "error" })
      },
      emitDelivery: (ev: DeliveryUpdateEvent) => this.emit("delivery:update", ev),
      resolveAgentDisplayName: (agentId) => this.resolveAgentDisplayName(agentId),
      trackKeyStart: (sessionId, idempotencyKey, openclawKey) => {
        let set = this.activeKeysBySession.get(sessionId)
        if (!set) {
          set = new Set()
          this.activeKeysBySession.set(sessionId, set)
        }
        set.add(idempotencyKey)
        this.sessionKeyByKey.set(idempotencyKey, openclawKey)
      },
      trackKeyEnd: (sessionId, idempotencyKey) => {
        this.activeKeysBySession.get(sessionId)?.delete(idempotencyKey)
        this.sessionKeyByKey.delete(idempotencyKey)
      },
      resolveMessageMeta: (params) => this.resolveMessageMeta(params),
    }

    const d = this.deps as GroupDeps
    this.directDeps = {
      backend: d.backend,
      emitMessage: d.emitMessage,
      emitLoop: d.emitLoop,
      emitStreamDelta: d.emitStreamDelta,
      emitStreamEnd: d.emitStreamEnd,
      emitError: d.emitError,
      emitDelivery: d.emitDelivery,
      trackKeyStart: d.trackKeyStart,
      trackKeyEnd: d.trackKeyEnd,
      resolveMessageMeta: d.resolveMessageMeta,
    }

    void this.reconcileAllOnStartup()
    this.startConnectionWatchdog()
    log.info("chat service ready")
  }

  async onShutdown(): Promise<void> {
    this.offGatewayEvents?.()
    this.offAgentEvents?.()
    this.offPluginEvents?.()
    if (this.connectionWatchdog) {
      clearInterval(this.connectionWatchdog)
      this.connectionWatchdog = null
    }
  }

  // ---------- ipc 可用的辅助 ----------

  /** ipc/message.ts 发消息后推 renderer。 */
  emitMessageNew(msg: ChatMessage): void {
    this.emit("message:new", msg)
  }

  /** ipc/session.ts + ipc/member.ts 创建 openclaw session。 */
  async createOpenClawSession(sessionKey: string, agentId: string): Promise<void> {
    await getGateway().call("sessions.create", { key: sessionKey, agentId })
  }

  /** ipc/session.ts + ipc/member.ts 删除 openclaw session。 */
  async deleteOpenClawSession(sessionKey: string): Promise<void> {
    await getGateway().call("sessions.delete", { key: sessionKey })
  }

  /**
   * 对账:拉 openclaw chat.history,按 id / content 指纹匹配本地消息。
   *
   * - 有匹配 → updateMessageMeta(usage / model / stopReason / openclawMessageId)刷新权威元数据
   * - 无匹配 → insertMessage 新增(外部工具或旁路写入的消息)
   *
   * 这样 live 路径缺的 usage 字段能在切 session 时被补齐,实现最终一致性。
   */
  async reconcileSession(sessionId: string): Promise<{ imported: number; updated: number }> {
    const session = getSession(sessionId)
    if (!session) return { imported: 0, updated: 0 }
    const members = listMembers(sessionId)
    if (members.length === 0) return { imported: 0, updated: 0 }
    const gw = getGateway()
    if (gw.getState().status !== "connected") return { imported: 0, updated: 0 }

    const localMessages = listMessages(sessionId)
    const localByOpenclawId = new Map<string, (typeof localMessages)[number]>()
    for (const m of localMessages) {
      if (m.openclawMessageId) localByOpenclawId.set(m.openclawMessageId, m)
    }
    const imported = 0
    let updated = 0

    for (const member of members) {
      const sessionKey = member.openclawKey
      try {
        const resp = await Promise.race([
          gw.call<{ messages?: OpenclawHistoryMessage[] }>("chat.history", { sessionKey }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("chat.history timeout 10s")), 10_000)),
        ])
        const messages = resp?.messages
        if (!Array.isArray(messages)) continue

        const sorted = [...messages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
        for (const r of sorted) {
          // 过滤非最终 assistant 消息:
          //   - user 消息:源头是 kaiwu,openclaw 里是镜像,跳过
          //   - tool / system 消息:openclaw 的工具调用/结果中间步骤,不入 kaiwu 视图
          //   - assistant + stopReason=toolUse 等非正常结束:工具调用中间片段,也跳过
          if (r.role !== "assistant") continue
          if (r.stopReason && !NORMAL_STOP.has(r.stopReason)) continue

          const contentText = extractHistoryText(r.content)
          const strongId = r.__openclaw?.id ?? null
          // 优先 id 精确匹配;其次 content 指纹(子串) + 时间窗
          let localMatch = strongId ? localByOpenclawId.get(strongId) : undefined
          if (!localMatch) {
            const fp = contentText.trim()
            const ts = r.timestamp ?? 0
            localMatch = localMessages.find((m) => {
              if (m.openclawSessionKey !== sessionKey) return false
              if (m.senderType !== "agent") return false
              const mText = ((m.content as { text?: string } | null)?.text ?? "").trim()
              if (!mText || !fp) return false
              // live msg 可能合并了 tool 输出 + final,openclaw final 只是最后一段 → 用子串匹配
              if (!mText.includes(fp) && !fp.includes(mText)) return false
              if (ts > 0 && Math.abs(m.createdAtLocal - ts) > 60_000) return false
              return true
            })
          }

          if (!localMatch) {
            // 找不到对应 live msg:agent 消息源头也是 kaiwu 自己(loop 触发 chat.send 后 openclaw 回写)。
            // 若连指纹都对不上,多半是 live insert 失败或数据异常。不自动 insert 避免重复,打 warn 告警。
            log.warn(`reconcile orphan assistant message sessionKey=${sessionKey} fp=${contentText.slice(0, 40)}...`)
            continue
          }

          // upsert:只刷新权威字段。避免把 null 覆盖掉 live 阶段已有的 fallback(用 nullish 判空)
          const nextUsage = normalizeUsage(r.usage)
          const nextModel = r.model ?? null
          const nextStopReason = r.stopReason ?? null
          const nextOpenclawId = strongId
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
      } catch (err) {
        log.warn(`reconcile member=${member.id} sessionKey=${sessionKey} failed: ${(err as Error).message}`)
      }
    }

    if (imported > 0 || updated > 0) log.info(`reconcile session=${sessionId} imported=${imported} updated=${updated}`)
    return { imported, updated }
  }

  // ---------- @Handle ----------

  @Handle("session:list") sessionList() {
    return sessionIpc.list()
  }
  @Handle("session:create") sessionCreate(input: CreateSessionInput) {
    return sessionIpc.create(this, input)
  }
  @Handle("session:delete") sessionDelete(id: string) {
    return sessionIpc.deleteOne(this, id)
  }
  @Handle("session:archive") sessionArchive(id: string, archived: boolean) {
    return sessionIpc.archive(id, archived)
  }
  @Handle("session:reconcile") sessionReconcile(sessionId: string) {
    return sessionIpc.reconcile(this, sessionId)
  }

  @Handle("message:list") messageList(sessionId: string): Promise<ChatMessage[]> {
    return messageIpc.list(sessionId)
  }
  @Handle("message:send") messageSend(sessionId: string, content: string, mentions?: ChatMention[], inReplyToMessageId?: string) {
    return messageIpc.send(this, sessionId, content, mentions, inReplyToMessageId)
  }
  @Handle("message:answer") messageAnswer(sessionId: string, input: AnswerAskInput) {
    return messageIpc.answer(this, sessionId, input)
  }
  @Handle("message:abort") messageAbort(sessionId: string): Promise<{ aborted: number }> {
    return messageIpc.abort(this, sessionId)
  }

  @Handle("member:list") memberList(sessionId: string): Promise<ChatMember[]> {
    return memberIpc.list(sessionId)
  }
  @Handle("member:add") memberAdd(sessionId: string, input: AddMemberInput) {
    return memberIpc.add(this, sessionId, input)
  }
  @Handle("member:remove") memberRemove(sessionId: string, memberId: string) {
    return memberIpc.remove(this, sessionId, memberId)
  }
  @Handle("member:patch") memberPatch(sessionId: string, memberId: string, patch: MemberPatch) {
    return memberIpc.patch(sessionId, memberId, patch)
  }

  @Handle("budget:get") budgetGet(sessionId: string): Promise<BudgetState | null> {
    return budgetIpc.get(sessionId)
  }
  @Handle("budget:reset") budgetReset(sessionId: string) {
    return budgetIpc.reset(sessionId)
  }

  @Handle("usage:get") usageGet(sessionId: string): Promise<SessionUsage | null> {
    return usageIpc.get(sessionId)
  }
  @Handle("usage:getMembers") usageGetMembers(sessionId: string): Promise<Record<string, SessionUsage>> {
    return usageIpc.getMembers(sessionId)
  }

  @Handle("inspect:getSessionDetail") inspectSessionDetail(sessionId: string): Promise<ChatSessionDetail | null> {
    return inspectIpc.getSessionDetail(sessionId)
  }
  @Handle("inspect:getTurn") inspectTurn(turnRunId: string): Promise<ChatTurn | null> {
    return inspectIpc.getTurnHandler(turnRunId)
  }

  @Handle("debug:clearAll") debugClearAll() {
    return debugIpc.clearAll()
  }

  // ---------- private: gateway + plugin 订阅 ----------

  private buildBackend(): ChatBackend {
    return {
      send: async (params) => {
        if (getGateway().getState().status !== "connected") {
          throw Object.assign(new Error("disconnected"), { errorKind: "disconnected" })
        }
        await getGateway().call("chat.send", { sessionKey: params.sessionKey, message: params.message, idempotencyKey: params.idempotencyKey })
      },
      onEvent: (idempotencyKey, listener) => {
        this.listenersByKey.set(idempotencyKey, listener)
        return () => {
          this.listenersByKey.delete(idempotencyKey)
        }
      },
      abort: async (params) => {
        await getGateway().call("chat.abort", { sessionKey: params.sessionKey, runId: params.idempotencyKey })
      },
    }
  }

  private startConnectionWatchdog(): void {
    this.connectionWatchdog = setInterval(() => {
      const connected = getGateway().getState().status === "connected"
      if (this.lastGatewayConnected && !connected && this.listenersByKey.size > 0) {
        log.warn(`gateway dropped with ${this.listenersByKey.size} active runs; dispatching synthetic disconnected errors`)
        for (const [key, listener] of this.listenersByKey) {
          try {
            listener({ kind: "error", idempotencyKey: key, message: "disconnected", errorKind: "disconnected" })
          } catch (err) {
            log.warn(`synthetic disconnected dispatch failed key=${key}: ${(err as Error).message}`)
          }
        }
      }
      this.lastGatewayConnected = connected
    }, 1000)
  }

  private async pollAndSubscribeGatewayChatEvents(): Promise<void> {
    for (let i = 0; i < 300; i++) {
      if (getGateway().getStream()) {
        this.subscribeGatewayChatEvents()
        return
      }
      await new Promise((r) => setTimeout(r, 100))
    }
    log.error("gateway stream never ready after 30s; chat events will be dropped")
  }

  private subscribeGatewayChatEvents(): void {
    const stream = getGateway().getStream()
    if (!stream) return
    this.subscribeGatewayAgentEvents(stream)
    this.offGatewayEvents = stream.on("chat", (frame: EventFrame) => {
      const p = (frame.payload ?? {}) as ChatEventPayload
      const idempotencyKey = p.runId
      if (!idempotencyKey) return
      const listener = this.listenersByKey.get(idempotencyKey)
      if (!listener) {
        if (p.state === "final" && p.sessionKey) {
          const member = this.findMemberByOpenClawKey(p.sessionKey)
          if (member) this.handleExternalFinal(member).catch((err) => log.warn(`external final ingest failed: ${(err as Error).message}`))
        }
        return
      }
      const textJoin = (p.message?.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
      if (p.state === "delta") listener({ kind: "delta", idempotencyKey, content: textJoin })
      else if (p.state === "final") listener({ kind: "final", idempotencyKey, content: textJoin, stopReason: p.stopReason, usage: p.usage as StepUsage | undefined })
      else if (p.state === "aborted") listener({ kind: "aborted", idempotencyKey })
      else if (p.state === "error") listener({ kind: "error", idempotencyKey, message: p.errorMessage ?? "unknown", errorKind: p.errorKind })
    })
  }

  private subscribeGatewayAgentEvents(stream: ReturnType<ReturnType<typeof getGateway>["getStream"]> & {}): void {
    if (!stream) return
    this.offAgentEvents = stream.on("agent", (frame: EventFrame) => {
      const p = (frame.payload ?? {}) as { runId?: string; stream?: string; data?: Record<string, unknown> }
      const idempotencyKey = p.runId
      if (!idempotencyKey) return
      const listener = this.listenersByKey.get(idempotencyKey)
      if (!listener) return
      const streamKind = p.stream
      const data = p.data ?? {}
      if (streamKind === "lifecycle") {
        const phase = data.phase as "start" | "end" | "error" | undefined
        if (phase === "start" || phase === "end" || phase === "error") listener({ kind: "lifecycle", idempotencyKey, phase })
      } else if (streamKind === "reasoning") {
        listener({ kind: "reasoning", idempotencyKey })
      } else if (streamKind === "tool") {
        const phase = data.phase as "start" | "end" | undefined
        const name = typeof data.name === "string" ? data.name : undefined
        if (phase === "start" || phase === "end") listener({ kind: "tool", idempotencyKey, phase, name })
      }
    })
  }

  private subscribePluginChatEvents(): void {
    const bridge = getBridgeServer()
    if (!bridge) return
    this.offPluginEvents = bridge.onEvent((event: PluginEvent) => {
      if (!this.deps) return
      if (event.type !== "custom") return
      const payload = event.payload as { channel?: string; data?: { kind?: string; sessionKey?: string; agentId?: string; question?: string; options?: string[] } } | undefined
      if (!payload || payload.channel !== "chat" || !payload.data) return
      const data = payload.data
      const member = data.sessionKey ? this.findMemberByOpenClawKey(data.sessionKey) : null
      if (!member) return
      if (data.kind === "hand_off" && data.agentId) {
        onMentionNextEvent(this.deps, member.sessionId, { agentId: data.agentId })
      } else if (data.kind === "ask_user" && data.question) {
        onAskUserEvent(this.deps, member.sessionId, { byAgentId: member.agentId, question: data.question, options: data.options })
      }
    })
  }

  // ---------- private: gateway 辅助 ----------

  private async handleExternalFinal(member: ChatMember): Promise<void> {
    const res = await this.reconcileSession(member.sessionId)
    if (res.imported > 0 || res.updated > 0) this.emit("messages:refresh", { sessionId: member.sessionId, reason: "external" })
  }

  private async reconcileAllOnStartup(): Promise<void> {
    for (let i = 0; i < 300; i++) {
      if (getGateway().getState().status === "connected") break
      await new Promise((r) => setTimeout(r, 100))
    }
    const sessions = listSessions().filter((s) => !s.archived)
    for (const s of sessions) {
      try {
        await this.reconcileSession(s.id)
      } catch (err) {
        log.warn(`startup reconcile session=${s.id} failed: ${(err as Error).message}`)
      }
    }
  }

  /**
   * 对单条刚写入的本地消息做元数据对账:向 openclaw 拉 chat.history,
   * 用 content 指纹 + 时间窗精确匹配到对应消息,回填 openclawMessageId / usage / model / stopReason。
   *
   * openclaw 写 JSONL 可能晚于 stream end 事件,所以分三次重试(200ms / 500ms / 1s)。
   * 全部失败也不 throw;切 session 的 reconcileSession 会做兜底对账。
   */
  private async resolveMessageMeta(params: { sessionId: string; localMsgId: string; sessionKey: string; contentText: string; createdAtLocal: number }): Promise<void> {
    const delays = [200, 500, 1000]
    for (const delay of delays) {
      await new Promise<void>((r) => setTimeout(r, delay))
      const gw = getGateway()
      if (gw.getState().status !== "connected") continue
      try {
        const resp = await gw.call<{ messages?: OpenclawHistoryMessage[] }>("chat.history", { sessionKey: params.sessionKey })
        const history = resp?.messages
        if (!Array.isArray(history) || history.length === 0) continue
        const matched = matchOpenclawMessage(
          { openclawMessageId: null, contentText: params.contentText, createdAtLocal: params.createdAtLocal },
          history,
        )
        if (!matched) continue
        updateMessageMeta(params.localMsgId, {
          openclawMessageId: matched.__openclaw?.id ?? null,
          usage: normalizeUsage(matched.usage),
          model: matched.model ?? null,
          stopReason: matched.stopReason ?? null,
        })
        this.emit("messages:refresh", { sessionId: params.sessionId, reason: "meta" })
        return
      } catch (err) {
        log.warn(`resolveMessageMeta retry delay=${delay}ms failed: ${(err as Error).message}`)
      }
    }
    log.warn(`resolveMessageMeta exhausted localMsgId=${params.localMsgId} sessionKey=${params.sessionKey}`)
  }

  private async pushContext(payload: ContextPayload): Promise<void> {
    const bridge = getBridgeServer()
    const creds = bridge?.getCredentials() ?? null
    await invokePluginBridge(creds?.token ?? null, { action: "context.set", params: payload })
  }

  private async resolveAgentDisplayName(agentId: string): Promise<string | undefined> {
    try {
      const res = await getGateway().call<{ agents: Array<{ id: string; name?: string; identity?: { name?: string } }> }>("agents.list")
      const a = res.agents.find((x) => x.id === agentId)
      return a?.identity?.name ?? a?.name
    } catch {
      return undefined
    }
  }

  private findMemberByOpenClawKey(key: string): ChatMember | null {
    const parsed = parseOpenClawKey(key.toLowerCase())
    if (!parsed) return null
    const session = listSessions().find((s) => s.id.toLowerCase() === parsed.sessionId)
    if (!session) return null
    const members = listMembers(session.id)
    if (parsed.mode === "direct") return members.find((m) => m.agentId.toLowerCase() === parsed.agentId) ?? null
    return members.find((m) => m.id.toLowerCase() === parsed.memberId) ?? null
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

export type { ChatBridge }
