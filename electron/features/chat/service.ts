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
import { insertMessage, listMembers, listMessages, listOpenclawMessageIds, listSessions, nextSeq, getSession } from "./repository"
import { nanoid } from "nanoid"
import { stripMentionsForAgent } from "./routing"
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
      emitLoop: (kind, sessionId, reason) => this.emit("loop:event", { sessionId, kind, reason }),
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
      fetchAssistantMeta: (sessionKey) => this.fetchAssistantMeta(sessionKey),
    }

    const d = this.deps
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
      fetchAssistantMeta: d.fetchAssistantMeta,
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

  /** ipc/session.ts 对账。 */
  async reconcileSession(sessionId: string): Promise<{ imported: number }> {
    const session = getSession(sessionId)
    if (!session) return { imported: 0 }
    const members = listMembers(sessionId)
    if (members.length === 0) return { imported: 0 }
    const gw = getGateway()
    if (gw.getState().status !== "connected") return { imported: 0 }

    const existingKeys = this.buildFuzzyKeySet(sessionId)
    const existingOpenclawIds = listOpenclawMessageIds(sessionId)
    const activeMembers = members
    let imported = 0

    for (const member of members) {
      const sessionKey = member.openclawKey
      try {
        const resp = await Promise.race([
          gw.call<{
            sessionKey?: string
            messages?: Array<{
              role: string
              content: unknown
              timestamp?: number
              model?: string
              stopReason?: string
              usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number; totalTokens?: number }
              __openclaw?: { id?: string; seq?: number; kind?: string }
            }>
          }>("chat.history", { sessionKey }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("chat.history timeout 10s")), 10_000)),
        ])
        const messages = resp?.messages
        if (!Array.isArray(messages)) continue

        const sorted = [...messages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
        for (const r of sorted) {
          const contentText = extractHistoryText(r.content)
          const strongId = r.__openclaw?.id ?? null
          const syntheticId = !strongId && r.timestamp ? `${r.role}:${r.timestamp}` : null
          const storedId = strongId ?? syntheticId
          const fuzzyKey = `${r.role}:${stripMentionsForAgent(contentText, activeMembers).slice(0, 80)}`
          if (storedId && existingOpenclawIds.has(storedId)) continue
          if (existingKeys.has(fuzzyKey)) continue

          const usage = r.usage
            ? {
                input: r.usage.input,
                output: r.usage.output,
                cacheRead: r.usage.cacheRead,
                cacheWrite: r.usage.cacheWrite,
                total: r.usage.totalTokens,
              }
            : null
          const senderType: "user" | "agent" = r.role === "user" ? "user" : "agent"
          const role: "user" | "assistant" | "tool" | "system" = r.role === "user" ? "user" : r.role === "assistant" ? "assistant" : r.role === "tool" ? "tool" : "system"

          insertMessage({
            id: nanoid(),
            sessionId,
            seq: nextSeq(sessionId),
            openclawSessionKey: sessionKey,
            openclawMessageId: storedId,
            senderType,
            senderId: senderType === "agent" ? member.agentId : null,
            role,
            content: { text: contentText },
            mentions: [],
            inReplyToMessageId: null,
            turnRunId: null,
            tags: ["synced"],
            model: r.model ?? null,
            usage,
            stopReason: r.stopReason ?? null,
            createdAtRemote: r.timestamp ?? null,
          })
          existingKeys.add(fuzzyKey)
          if (storedId) existingOpenclawIds.add(storedId)
          imported++
        }
      } catch (err) {
        log.warn(`reconcile member=${member.id} sessionKey=${sessionKey} failed: ${(err as Error).message}`)
      }
    }

    if (imported > 0) log.info(`reconcile session=${sessionId} imported=${imported} messages`)
    return { imported }
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
    if (res.imported > 0) this.emit("messages:refresh", { sessionId: member.sessionId, reason: "external" })
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

  private buildFuzzyKeySet(sessionId: string): Set<string> {
    const members = listMembers(sessionId)
    const set = new Set<string>()
    for (const m of listMessages(sessionId)) {
      const text = extractHistoryText(m.content)
      const cleaned = stripMentionsForAgent(text, members)
      const role = m.senderType === "user" ? "user" : m.senderType === "agent" ? "assistant" : m.role
      set.add(`${role}:${cleaned.slice(0, 80)}`)
    }
    return set
  }

  private async fetchAssistantMeta(sessionKey: string): Promise<{
    id?: string
    model?: string
    usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number; total?: number }
    stopReason?: string
  } | null> {
    try {
      const resp = await getGateway().call<{
        messages?: Array<{
          role: string
          model?: string
          stopReason?: string
          usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number; totalTokens?: number }
          __openclaw?: { id?: string }
        }>
      }>("chat.history", { sessionKey })
      const history = resp?.messages
      if (!Array.isArray(history) || history.length === 0) return null
      const last = [...history].reverse().find((m) => m.role === "assistant")
      if (!last) return null
      const u = last.usage
      const usage = u ? { input: u.input, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite, total: u.totalTokens } : undefined
      return { id: last.__openclaw?.id, model: last.model, usage, stopReason: last.stopReason }
    } catch (err) {
      log.warn(`fetchAssistantMeta failed sessionKey=${sessionKey}: ${(err as Error).message}`)
      return null
    }
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
