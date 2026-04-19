/**
 * chat feature 的 IpcController。作为 service 层协调 repository / group loop / openclaw RPC。
 *
 * 本 service 负责 "把 plugin 的 chat 事件桥接到 group loop"：
 * plugin 推来的 mention_next / ask_user 都通过 bridge server 订阅。
 */

import { nanoid } from "nanoid"
import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import { scope } from "../../infra/logger"
import type { ChatBackend } from "../../agent/executor"
import type { StepEvent, StepUsage } from "../../agent/types"
import { hasPending, onAskUserEvent, onMentionNextEvent, onNewMessage, takePending, type GroupDeps } from "./group"
import { sendDirect, type DirectDeps } from "./direct"
import { buildSessionInitParams, parseOpenClawKey } from "./bootstrap"
import {
  deleteSession as deleteSessionRow,
  getBudgetState,
  getSession,
  insertMember,
  insertMessage,
  insertSession,
  listActiveMembers,
  listOpenclawMessageIds,
  listMembers,
  listMessages,
  listSessions,
  markMemberLeft,
  nextSeq,
  patchMember as patchMemberRow,
  resetBudgetState,
  setSessionArchived,
} from "./repository"
import { getBridgeServer, getGateway } from "../openclaw/runtime"
import { call as invokePluginBridge } from "../openclaw/bridge/call"
import type { EventFrame } from "../openclaw/gateway/contract"
import type { PluginEvent } from "../openclaw/contracts/plugin"
import { stripMentionsForAgent } from "./mention-utils"
import { fetchManySessionUsages, fetchSessionUsage } from "./usage"
import type {
  AddMemberInput,
  AnswerAskInput,
  BudgetState,
  ChatBridge,
  ChatEvents,
  ChatMember,
  ChatMention,
  ChatMessage,
  ChatSession,
  CreateSessionInput,
  DeliveryUpdateEvent,
  MemberPatch,
  SessionUsage,
} from "./types"

const log = scope("chat:service")

/** 过滤接收到的 gateway chat event 帧，提取文本拼接。 */
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
  private deps: GroupDeps | null = null
  private directDeps: DirectDeps | null = null
  /** idempotencyKey → listener，用于 ChatBackend.onEvent 按 key 分发流式事件。 */
  private readonly listenersByKey = new Map<string, (ev: StepEvent) => void>()
  /** sessionId → 活跃 idempotencyKey 集合。abort 时查该表把 session 下所有 run 一起停。 */
  private readonly activeKeysBySession = new Map<string, Set<string>>()
  /** idempotencyKey → openclaw sessionKey。chat.abort 需要 sessionKey 定位。 */
  private readonly sessionKeyByKey = new Map<string, string>()
  private offGatewayEvents: (() => void) | null = null
  private offPluginEvents: (() => void) | null = null

  async onReady(): Promise<void> {
    // gateway 连接是异步的，onReady 时 stream 很可能未就绪。轮询等 stream 可用再订阅。
    void this.pollAndSubscribeGatewayChatEvents()
    this.subscribePluginChatEvents()

    this.deps = {
      backend: this.buildBackend(),
      pushContext: (payload) => this.pushContext(payload),
      emitMessage: (msg) => this.emit("message:new", msg),
      emitLoop: (kind, sessionId, reason) => this.emit("loop:event", { sessionId, kind, reason }),
      emitPaused: (ev) => this.emit("loop:paused", ev),
      emitStreamDelta: (sessionId, idempotencyKey, openclawSessionKey, content) =>
        this.emit("stream:delta", { sessionId, idempotencyKey, openclawSessionKey, content }),
      emitStreamEnd: (sessionId, idempotencyKey, openclawSessionKey) =>
        this.emit("stream:end", { sessionId, idempotencyKey, openclawSessionKey }),
      emitError: (sessionId, idempotencyKey, openclawSessionKey, message) => {
        const kind: "disconnected" | "error" = /disconnect/i.test(message) ? "disconnected" : "error"
        this.emit("chat:error", { sessionId, idempotencyKey, openclawSessionKey, message, kind })
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

    // 启动时全量对账（等 gateway 连上后自动跑，不阻塞 onReady）
    void this.reconcileAllOnStartup()

    // 连接健康 watchdog：发现 gateway 掉线时，把所有活跃 run 用合成 "disconnected" error 收尾，
    // 避免 runStep 因事件流中断永挂。
    this.startConnectionWatchdog()

    log.info("chat service ready")
  }

  private connectionWatchdog: ReturnType<typeof setInterval> | null = null
  private lastGatewayConnected = true

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

  /** 100ms 轮询 gateway stream，可用即订阅；30s 上限，超时打 error。 */
  private async pollAndSubscribeGatewayChatEvents(): Promise<void> {
    for (let i = 0; i < 300; i++) {
      if (getGateway().getStream()) {
        log.info(`gateway stream ready after ${i * 100}ms, subscribing chat events`)
        this.subscribeGatewayChatEvents()
        return
      }
      await new Promise((r) => setTimeout(r, 100))
    }
    log.error("gateway stream never ready after 30s; chat events will be dropped")
  }

  async onShutdown(): Promise<void> {
    this.offGatewayEvents?.()
    this.offPluginEvents?.()
    if (this.connectionWatchdog) {
      clearInterval(this.connectionWatchdog)
      this.connectionWatchdog = null
    }
  }

  // ========== session ==========
  @Handle("session:list") async list(): Promise<ChatSession[]> {
    return listSessions()
  }

  @Handle("session:create") async create(input: CreateSessionInput): Promise<ChatSession> {
    if (input.mode === "direct" && input.members.length !== 1) {
      throw new Error("direct chat must have exactly 1 member")
    }
    if (input.mode === "group" && input.members.length < 1) {
      throw new Error("group chat must have at least 1 member")
    }
    const sessionId = nanoid()
    insertSession({
      id: sessionId,
      mode: input.mode,
      label: input.label ?? null,
      openclawKey: null,
      budget: input.budget ?? {},
      strategy: { kind: "broadcast" },
      supervisorId: input.supervisorId ?? null,
    })
    for (const m of input.members) {
      const memberId = nanoid()
      const params = buildSessionInitParams({ sessionId, memberId, agentId: m.agentId, mode: input.mode, replyMode: m.replyMode })
      await this.createOpenClawSession(params.key, m.agentId)
      insertMember({ id: memberId, sessionId, agentId: m.agentId, openclawKey: params.key, replyMode: m.replyMode, seedHistory: m.seedHistory ?? false })
    }
    const created = getSession(sessionId)
    if (!created) throw new Error("failed to load created session")
    return created
  }

  @Handle("session:delete") async deleteHandler(id: string): Promise<void> {
    const members = listMembers(id)
    for (const m of members) {
      await this.deleteOpenClawSession(m.openclawKey).catch((err) => log.warn(`delete openclaw session failed: ${(err as Error).message}`))
    }
    deleteSessionRow(id)
  }

  @Handle("session:archive") async archive(id: string, archived: boolean): Promise<void> {
    setSessionArchived(id, archived)
  }

  @Handle("session:reconcile") async reconcile(sessionId: string): Promise<{ imported: number }> {
    return this.reconcileSession(sessionId)
  }

  // ========== message ==========
  @Handle("message:list") async listMessagesHandler(sessionId: string): Promise<ChatMessage[]> {
    return listMessages(sessionId)
  }

  @Handle("message:send") async sendUserMessage(sessionId: string, content: string): Promise<void> {
    log.info(`message:send sessionId=${sessionId} contentLen=${content.length}`)
    if (!this.deps) {
      log.error("message:send called but deps not ready")
      throw new Error("chat service not ready")
    }
    // preflight 四闸（参考 discord plugin：gate-before-persist，避免脏数据）
    if (!content.trim()) {
      throw new Error("message content is empty")
    }
    const preSession = getSession(sessionId)
    if (!preSession) {
      throw new Error(`session ${sessionId} not found`)
    }
    if (preSession.archived) {
      throw new Error(`session ${sessionId} is archived`)
    }
    const members = listActiveMembers(sessionId)
    if (members.length === 0) {
      throw new Error(`session ${sessionId} has no active members`)
    }
    log.info(`message:send activeMembers=${members.length} memberIds=${members.map((m) => m.id).join(",")}`)
    const userMsg: ChatMessage = {
      id: nanoid(),
      sessionId,
      seq: nextSeq(sessionId),
      openclawSessionKey: null,
      openclawMessageId: null,
      senderType: "user",
      senderId: null,
      role: "user",
      content: { text: content },
      mentions: parseMentionsFromText(content, members),
      turnRunId: null,
      tags: [],
      model: null,
      usage: null,
      stopReason: null,
      createdAtLocal: Date.now(),
      createdAtRemote: null,
    }
    insertMessage({
      id: userMsg.id,
      sessionId,
      seq: userMsg.seq,
      openclawSessionKey: null,
      openclawMessageId: null,
      senderType: "user",
      senderId: null,
      role: "user",
      content: userMsg.content,
      mentions: userMsg.mentions,
      turnRunId: null,
      tags: [],
      model: null,
      usage: null,
      stopReason: null,
      createdAtRemote: null,
    })
    this.emit("message:new", userMsg)

    try {
      if (preSession.mode === "direct") {
        if (!this.directDeps) throw new Error("direct deps not ready")
        log.info(`message:send dispatching to direct loop sessionId=${sessionId}`)
        await sendDirect(this.directDeps, sessionId, userMsg)
      } else {
        log.info(`message:send dispatching to group loop sessionId=${sessionId}`)
        await onNewMessage(this.deps, sessionId, userMsg)
      }
      log.info(`message:send loop completed sessionId=${sessionId}`)
    } catch (err) {
      log.error(`message:send loop threw sessionId=${sessionId}: ${(err as Error).message}\n${(err as Error).stack ?? ""}`)
      throw err
    }
  }

  @Handle("message:answer") async answerAsk(sessionId: string, input: AnswerAskInput): Promise<void> {
    if (!hasPending(input.pendingId)) throw new Error(`pending id ${input.pendingId} not found`)
    takePending(input.pendingId)
    await this.sendUserMessage(sessionId, input.answer)
  }

  @Handle("message:abort") async abortSession(sessionId: string): Promise<{ aborted: number }> {
    const keys = this.activeKeysBySession.get(sessionId)
    if (!keys || keys.size === 0) {
      log.info(`message:abort sessionId=${sessionId} no active keys`)
      return { aborted: 0 }
    }
    const uniqueSessionKeys = new Set<string>()
    for (const key of keys) {
      const sk = this.sessionKeyByKey.get(key)
      if (sk) uniqueSessionKeys.add(sk)
    }
    log.info(`message:abort sessionId=${sessionId} keys=${keys.size} sessionKeys=${uniqueSessionKeys.size}`)
    // 对每个 openclaw sessionKey 调 chat.abort（runId 省略 = 中断该 sessionKey 所有活跃 run）
    await Promise.allSettled(
      Array.from(uniqueSessionKeys).map((sessionKey) =>
        getGateway()
          .call("chat.abort", { sessionKey })
          .catch((err) => log.warn(`chat.abort failed sessionKey=${sessionKey}: ${(err as Error).message}`)),
      ),
    )
    return { aborted: keys.size }
  }

  // ========== member ==========
  @Handle("member:list") async listMembersHandler(sessionId: string): Promise<ChatMember[]> {
    return listMembers(sessionId)
  }

  @Handle("member:add") async addMember(sessionId: string, input: AddMemberInput): Promise<ChatMember> {
    const session = getSession(sessionId)
    if (!session) throw new Error(`session ${sessionId} not found`)
    const memberId = nanoid()
    const params = buildSessionInitParams({ sessionId, memberId, agentId: input.agentId, mode: session.mode, replyMode: input.replyMode })
    await this.createOpenClawSession(params.key, input.agentId)
    insertMember({ id: memberId, sessionId, agentId: input.agentId, openclawKey: params.key, replyMode: input.replyMode, seedHistory: input.seedHistory ?? false })
    const m = listMembers(sessionId).find((x) => x.id === memberId)
    if (!m) throw new Error("failed to load new member")
    return m
  }

  @Handle("member:remove") async removeMember(sessionId: string, memberId: string): Promise<void> {
    const m = listMembers(sessionId).find((x) => x.id === memberId)
    if (!m) return
    await this.deleteOpenClawSession(m.openclawKey).catch(() => {
      /* best effort */
    })
    markMemberLeft(memberId)
  }

  @Handle("member:patch") async memberPatch(sessionId: string, memberId: string, patch: MemberPatch): Promise<ChatMember> {
    patchMemberRow(memberId, patch)
    const m = listMembers(sessionId).find((x) => x.id === memberId)
    if (!m) throw new Error("member not found after patch")
    return m
  }

  // ========== budget ==========
  @Handle("budget:get") async budgetGet(sessionId: string): Promise<BudgetState | null> {
    return getBudgetState(sessionId)
  }

  @Handle("budget:reset") async budgetReset(sessionId: string): Promise<void> {
    resetBudgetState(sessionId)
  }

  // ========== usage ==========
  @Handle("usage:get") async usageGet(sessionId: string): Promise<SessionUsage | null> {
    // 单聊:取第一个(唯一) member 的 usage。群聊不推荐走此路径。
    const members = listMembers(sessionId)
    const member = members[0]
    if (!member) return null
    return fetchSessionUsage(member.openclawKey)
  }

  @Handle("usage:getMembers") async usageGetMembers(sessionId: string): Promise<Record<string, SessionUsage>> {
    // 一次 sessions.list 取全,按 openclawKey 映射回 memberId 返回
    const members = listMembers(sessionId)
    if (members.length === 0) return {}
    const keyMap = await fetchManySessionUsages(members.map((m) => m.openclawKey))
    const out: Record<string, SessionUsage> = {}
    for (const m of members) {
      const u = keyMap[m.openclawKey]
      if (u) out[m.id] = u
    }
    return out
  }

  // ========== private ==========
  private buildBackend(): ChatBackend {
    return {
      send: async (params) => {
        log.info(`chat.send RPC call sessionKey=${params.sessionKey} idempotencyKey=${params.idempotencyKey} msgLen=${params.message.length}`)
        // 预检 gateway 状态；断连时直接抛 disconnected，避免把传输问题当成真实错误
        if (getGateway().getState().status !== "connected") {
          throw new Error("disconnected")
        }
        try {
          const res = await getGateway().call("chat.send", { sessionKey: params.sessionKey, message: params.message, idempotencyKey: params.idempotencyKey })
          log.info(`chat.send RPC ack idempotencyKey=${params.idempotencyKey}, response=${JSON.stringify(res)}`)
        } catch (err) {
          log.error(`chat.send RPC failed idempotencyKey=${params.idempotencyKey}: ${(err as Error).message}`)
          throw err
        }
      },
      onEvent: (idempotencyKey, listener) => {
        log.debug(`listener registered key=${idempotencyKey}, total=${this.listenersByKey.size + 1}`)
        this.listenersByKey.set(idempotencyKey, listener)
        return () => {
          this.listenersByKey.delete(idempotencyKey)
          log.debug(`listener removed key=${idempotencyKey}, remaining=${this.listenersByKey.size}`)
        }
      },
      abort: async (params) => {
        log.info(`chat.abort RPC sessionKey=${params.sessionKey} key=${params.idempotencyKey}`)
        // openclaw 入参字段名叫 runId，边界映射
        await getGateway().call("chat.abort", { sessionKey: params.sessionKey, runId: params.idempotencyKey })
      },
    }
  }

  private subscribeGatewayChatEvents(): void {
    const stream = getGateway().getStream()
    if (!stream) {
      log.warn("gateway stream not available yet; chat events won't be routed until connected")
      return
    }
    log.info("subscribing to gateway chat events")
    this.offGatewayEvents = stream.on("chat", (frame: EventFrame) => {
      const p = (frame.payload ?? {}) as ChatEventPayload
      // 边界映射：openclaw payload 字段叫 runId，kaiwu 内部一律叫 idempotencyKey
      const idempotencyKey = p.runId
      log.debug(`chat event received: state=${p.state} key=${idempotencyKey} payloadKeys=${Object.keys(p).join(",")}`)
      if (!idempotencyKey) {
        log.warn(`chat event without runId dropped, state=${p.state}`)
        return
      }
      const listener = this.listenersByKey.get(idempotencyKey)
      if (!listener) {
        // 旁路：外部 client（openclaw UI 等）发起的 run
        // 只消费 final 且 sessionKey 属 kaiwu 登记 member
        if (p.state === "final" && p.sessionKey) {
          const member = this.findMemberByOpenClawKey(p.sessionKey)
          if (member) {
            this.handleExternalFinal(member, p, idempotencyKey).catch((err) => log.warn(`external final ingest failed: ${(err as Error).message}`))
          } else {
            log.debug(`external final for unknown sessionKey=${p.sessionKey}, key=${idempotencyKey}`)
          }
        }
        return
      }
      const textJoin = (p.message?.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
      if (p.state === "delta") {
        listener({ kind: "delta", idempotencyKey, content: textJoin })
      } else if (p.state === "final") {
        log.info(`chat final received key=${idempotencyKey}, textLen=${textJoin.length}`)
        listener({ kind: "final", idempotencyKey, content: textJoin, stopReason: p.stopReason, usage: p.usage as StepUsage | undefined })
      } else if (p.state === "aborted") {
        log.info(`chat aborted key=${idempotencyKey}`)
        listener({ kind: "aborted", idempotencyKey })
      } else if (p.state === "error") {
        log.warn(`chat error key=${idempotencyKey}, message=${p.errorMessage}, kind=${p.errorKind}`)
        listener({ kind: "error", idempotencyKey, message: p.errorMessage ?? "unknown", errorKind: p.errorKind })
      }
    })
  }

  private subscribePluginChatEvents(): void {
    const bridge = getBridgeServer()
    if (!bridge) {
      log.warn("bridge server not ready yet; plugin events won't be routed")
      return
    }
    this.offPluginEvents = bridge.onEvent((event: PluginEvent) => {
      if (!this.deps) return
      if (event.type !== "custom") return
      const payload = event.payload as { channel?: string; data?: { kind?: string; sessionKey?: string; agentId?: string; question?: string; options?: string[] } } | undefined
      if (!payload || payload.channel !== "chat" || !payload.data) return
      const data = payload.data
      const member = data.sessionKey ? this.findMemberByOpenClawKey(data.sessionKey) : null
      if (!member) return
      if (data.kind === "mention_next" && data.agentId) {
        onMentionNextEvent(this.deps, member.sessionId, { agentId: data.agentId })
      } else if (data.kind === "ask_user" && data.question) {
        onAskUserEvent(this.deps, member.sessionId, { byAgentId: member.agentId, question: data.question, options: data.options })
      }
    })
  }

  private async createOpenClawSession(sessionKey: string, agentId: string): Promise<void> {
    // 故意不传 label：openclaw 约束 label 在 agent 内唯一，kaiwu label 归本地管。
    await getGateway().call("sessions.create", { key: sessionKey, agentId })
  }

  /**
   * 对账：拉 openclaw chat.history 与 kaiwu DB 比对，补齐遗漏消息。
   * 幂等键 = openclaw_message_id (来自 __openclaw.id)。
   * 触发时机：用户进入会话、应用启动、旁路监听未覆盖的场景。
   */
  private async reconcileSession(sessionId: string): Promise<{ imported: number }> {
    const session = getSession(sessionId)
    if (!session) return { imported: 0 }
    const members = listMembers(sessionId)
    if (members.length === 0) return { imported: 0 }
    const gw = getGateway()
    if (gw.getState().status !== "connected") return { imported: 0 }

    // 三层去重键：
    //   ① strongId = __openclaw.id（来自 transcript 文件，UUID，最稳）
    //   ② syntheticId = role + timestamp（id 缺失时的次佳合成键）
    //   ③ fuzzyKey = role + 剥离 @mention 后的文本前缀 80 字
    //      (kaiwu 本地存含 @ 的原文,发给 openclaw 的是 stripped 版本,两边 key 必须同口径)
    const existingKeys = this.buildFuzzyKeySet(sessionId)
    const existingOpenclawIds = listOpenclawMessageIds(sessionId)
    const activeMembers = members
    let imported = 0

    for (const member of members) {
      const sessionKey = member.openclawKey
      log.info(`reconcile member=${member.id} sessionKey=${sessionKey} calling chat.history`)
      try {
        // 10s 超时防 hang
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
        log.info(`reconcile member=${member.id} chat.history returned ${Array.isArray(messages) ? `count=${messages.length}` : "not-array"}`)
        if (!Array.isArray(messages)) continue

        const sorted = [...messages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))

        for (const r of sorted) {
          const contentText = extractHistoryText(r.content)
          const strongId = r.__openclaw?.id ?? null
          const syntheticId = !strongId && r.timestamp ? `${r.role}:${r.timestamp}` : null
          const storedId = strongId ?? syntheticId
          // 与 buildFuzzyKeySet 口径一致:两边都用 stripMentions 后的文本
          const fuzzyKey = `${r.role}:${stripMentionsForAgent(contentText, activeMembers).slice(0, 80)}`

          // 三层去重
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

    if (imported > 0) {
      log.info(`reconcile session=${sessionId} imported=${imported} messages`)
    }
    return { imported }
  }

  /**
   * 构造 fuzzy 幂等键集合:role + 剥离 @mention 后的文本前缀。
   * 剥离理由:kaiwu 本地存的是含 @ 的原文,发给 openclaw 的是 stripped 版本;
   * openclaw 返回的 history 是 stripped,两边必须同口径才对得上。
   */
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

  /**
   * 外部 client（openclaw UI 等）对 kaiwu 登记的 sessionKey 发消息时，通过 chat event 路由到这里。
   * kaiwu 不知道对应的 user message（event 只带 assistant 的 final），直接走对账一把拉齐：
   *   user message + assistant message 都补。
   * 幂等：reconcileSession 按 openclawMessageId 去重，重复触发不入库重复数据。
   */
  private async handleExternalFinal(member: ChatMember, _payload: ChatEventPayload, _idempotencyKey: string): Promise<void> {
    log.info(`external final detected member=${member.id} sessionKey=${member.openclawKey}, triggering reconcile`)
    const res = await this.reconcileSession(member.sessionId)
    if (res.imported > 0) {
      this.emit("messages:refresh", { sessionId: member.sessionId, reason: "external" })
    }
  }

  /** 启动时对所有未 archived 会话对账一次（fire-and-forget，不阻塞 ready）。 */
  private async reconcileAllOnStartup(): Promise<void> {
    // 延迟到 gateway 连接后再跑
    for (let i = 0; i < 300; i++) {
      if (getGateway().getState().status === "connected") break
      await new Promise((r) => setTimeout(r, 100))
    }
    const sessions = listSessions().filter((s) => !s.archived)
    log.info(`reconcileAllOnStartup scanning ${sessions.length} sessions`)
    for (const s of sessions) {
      try {
        await this.reconcileSession(s.id)
      } catch (err) {
        log.warn(`startup reconcile session=${s.id} failed: ${(err as Error).message}`)
      }
    }
  }

  /** 拉 openclaw chat.history 最后一条 assistant 消息的元数据（id / usage / model / stopReason）。 */
  private async fetchAssistantMeta(
    sessionKey: string,
  ): Promise<{
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
      const usage = u
        ? {
            input: u.input,
            output: u.output,
            cacheRead: u.cacheRead,
            cacheWrite: u.cacheWrite,
            // openclaw 用 totalTokens，kaiwu 内部统一 total
            total: u.totalTokens,
          }
        : undefined
      return { id: last.__openclaw?.id, model: last.model, usage, stopReason: last.stopReason }
    } catch (err) {
      log.warn(`fetchAssistantMeta failed sessionKey=${sessionKey}: ${(err as Error).message}`)
      return null
    }
  }

  private async deleteOpenClawSession(sessionKey: string): Promise<void> {
    await getGateway().call("sessions.delete", { key: sessionKey })
  }

  private async pushContext(payload: { sessionKey: string; instruction: string; knowledge: string[]; sharedHistory?: string }): Promise<void> {
    const bridge = getBridgeServer()
    const creds = bridge?.getCredentials() ?? null
    await invokePluginBridge(creds?.token ?? null, { action: "context.set", params: payload })
  }

  private async resolveAgentDisplayName(agentId: string): Promise<string | undefined> {
    log.debug(`resolveAgentDisplayName start agentId=${agentId}`)
    try {
      const res = await getGateway().call<{ agents: Array<{ id: string; name?: string; identity?: { name?: string } }> }>("agents.list")
      const a = res.agents.find((x) => x.id === agentId)
      log.debug(`resolveAgentDisplayName result agentId=${agentId} name=${a?.identity?.name ?? a?.name ?? "<none>"}`)
      return a?.identity?.name ?? a?.name
    } catch (err) {
      log.warn(`resolveAgentDisplayName catch: ${(err as Error).message}`)
      return undefined
    }
  }

  private findMemberByOpenClawKey(key: string): ChatMember | null {
    // openclaw gateway 对 sessionKey 做小写归一化；kaiwu DB 里保存的是原始大小写。
    // 反查时一律按 lowercase 比对。
    const parsed = parseOpenClawKey(key.toLowerCase())
    if (!parsed) return null

    // 扫所有 session，按 lowercase sessionId 找（因 openclaw 归一化了 session 段）
    const session = listSessions().find((s) => s.id.toLowerCase() === parsed.sessionId)
    if (!session) return null
    const members = listMembers(session.id)

    if (parsed.mode === "direct") {
      return members.find((m) => m.agentId.toLowerCase() === parsed.agentId) ?? null
    }
    return members.find((m) => m.id.toLowerCase() === parsed.memberId) ?? null
  }
}

/** 从 chat.history 返回的 content 字段提取纯文本（支持 string / {text} / 数组 blocks 三种形态）。 */
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

function parseMentionsFromText(content: string, members: ChatMember[]): ChatMention[] {
  const found: ChatMention[] = []
  for (const m of members) {
    const re = new RegExp(`@${escapeRegex(m.agentId)}\\b`, "i")
    if (re.test(content)) found.push({ agentId: m.agentId, source: "plain" })
  }
  return found
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Ensure ChatBridge type gets pulled in for consumers (preload bridge validates against it).
export type { ChatBridge }
