/**
 * chat feature 的 IpcController。
 *
 * 本类只负责:
 *   - 生命周期 (onReady / onShutdown)
 *   - 共享 state (deps / listenersByKey / active runs / gateway subscriptions)
 *   - @Handle 装饰器 + 1 行 delegate 到 ipc/<prefix>.ts
 *   - gateway/plugin 事件订阅 (private 方法,后续可抽到 events/)
 *
 * 所有 IPC 处理逻辑拆到 `ipc/*.ts` 按前缀分组。
 */

import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import { scope } from "../../infra/logger"
import type { ChatBackend } from "../../agent/executor"
import type { StepEvent, StepUsage } from "../../agent/types"
import { onAskUserEvent, onMentionNextEvent, type GroupDeps } from "./loops"
import type { ContextPayload } from "./loops/prompt"
import { parseOpenClawKey } from "./keys"
import { listMembers, listSessions, getSession } from "./repository"
import { handleExternalFinal, reconcileAllOnStartup, reconcileSession, resolveMessageMeta } from "./reconcile"
import { getBridgeServer, getGateway } from "../openclaw/runtime"
import { call as invokePluginBridge } from "../openclaw/bridge/call"
import type { EventFrame } from "../openclaw/gateway/contract"
import type { PluginEvent } from "../openclaw/contracts/plugin"
import * as sessionIpc from "./ipc/session"
import * as messageIpc from "./ipc/message"
import * as usageIpc from "./ipc/usage"
import * as adminIpc from "./ipc/admin"
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
          void reconcileSession(sessionId)
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
      resolveMessageMeta: (params) => resolveMessageMeta(this.reconcileEmitter, params),
    }

    void reconcileAllOnStartup()
    this.startConnectionWatchdog()
    log.info("chat service ready")
  }

  /** reconcile 模块需要的 emit 钩子(避免循环依赖)。 */
  private get reconcileEmitter() {
    return {
      emitMessagesRefresh: (sessionId: string, reason: "reconcile" | "external" | "meta") => this.emit("messages:refresh", { sessionId, reason }),
    }
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

  /** 暴露给 ipc/session.ts 的 reconcile 入口(代理到 reconcile 模块)。 */
  async reconcileSession(sessionId: string): Promise<{ imported: number; updated: number }> {
    return reconcileSession(sessionId)
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
    return messageIpc.memberList(sessionId)
  }
  @Handle("member:add") memberAdd(sessionId: string, input: AddMemberInput) {
    return messageIpc.memberAdd(this, sessionId, input)
  }
  @Handle("member:remove") memberRemove(sessionId: string, memberId: string) {
    return messageIpc.memberRemove(this, sessionId, memberId)
  }
  @Handle("member:patch") memberPatch(sessionId: string, memberId: string, patch: MemberPatch) {
    return messageIpc.memberPatch(sessionId, memberId, patch)
  }

  @Handle("budget:get") budgetGet(sessionId: string): Promise<BudgetState | null> {
    return usageIpc.budgetGet(sessionId)
  }
  @Handle("budget:reset") budgetReset(sessionId: string) {
    return usageIpc.budgetReset(sessionId)
  }

  @Handle("usage:get") usageGet(sessionId: string): Promise<SessionUsage | null> {
    return usageIpc.get(sessionId)
  }
  @Handle("usage:getMembers") usageGetMembers(sessionId: string): Promise<Record<string, SessionUsage>> {
    return usageIpc.getMembers(sessionId)
  }

  @Handle("inspect:getSessionDetail") inspectSessionDetail(sessionId: string): Promise<ChatSessionDetail | null> {
    return usageIpc.inspectSessionDetail(sessionId)
  }
  @Handle("inspect:getTurn") inspectTurn(turnRunId: string): Promise<ChatTurn | null> {
    return usageIpc.inspectTurn(turnRunId)
  }

  @Handle("debug:clearAll") debugClearAll() {
    return adminIpc.clearAll()
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
          if (member) handleExternalFinal(this.reconcileEmitter, member).catch((err) => log.warn(`external final ingest failed: ${(err as Error).message}`))
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
        // 路由权限检查:仅本群 supervisor 的 hand_off 生效,worker 静默忽略(防误调度)
        const session = getSession(member.sessionId)
        if (!session || session.supervisorId !== member.id) {
          log.warn(`hand_off ignored:sender member=${member.id} is not supervisor of session=${member.sessionId}`)
          return
        }
        onMentionNextEvent(this.deps, member.sessionId, { agentId: data.agentId })
      } else if (data.kind === "ask_user" && data.question) {
        onAskUserEvent(this.deps, member.sessionId, { byAgentId: member.agentId, question: data.question, options: data.options })
      }
    })
  }

  // ---------- private: gateway 辅助 ----------

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

export type { ChatBridge }
