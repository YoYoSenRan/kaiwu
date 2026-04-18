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
import { buildSessionInitParams } from "./bootstrap"
import {
  deleteSession as deleteSessionRow,
  getBudgetState,
  getSession,
  insertMember,
  insertMessage,
  insertSession,
  listActiveMembers,
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
  MemberPatch,
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
  /** runId → listener，用于 ChatBackend.onEvent 分发。 */
  private readonly runListeners = new Map<string, (ev: StepEvent) => void>()
  private offGatewayEvents: (() => void) | null = null
  private offPluginEvents: (() => void) | null = null

  async onReady(): Promise<void> {
    this.subscribeGatewayChatEvents()
    this.subscribePluginChatEvents()

    this.deps = {
      backend: this.buildBackend(),
      pushContext: (payload) => this.pushContext(payload),
      emitMessage: (msg) => this.emit("message:new", msg),
      emitLoop: (kind, sessionId, reason) => this.emit("loop:event", { sessionId, kind, reason }),
      emitPaused: (ev) => this.emit("loop:paused", ev),
      resolveAgentDisplayName: (agentId) => this.resolveAgentDisplayName(agentId),
    }

    log.info("chat service ready")
  }

  async onShutdown(): Promise<void> {
    this.offGatewayEvents?.()
    this.offPluginEvents?.()
  }

  // ========== session ==========
  @Handle("session:list") async list(): Promise<ChatSession[]> {
    return listSessions()
  }

  @Handle("session:create") async create(input: CreateSessionInput): Promise<ChatSession> {
    if (input.mode === "single" && input.members.length !== 1) {
      throw new Error("single chat must have exactly 1 member")
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
      const params = buildSessionInitParams({ sessionId, memberId, agentId: m.agentId, replyMode: m.replyMode })
      await this.createOpenClawSession(params.key, m.agentId, params.label)
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

  // ========== message ==========
  @Handle("message:list") async listMessagesHandler(sessionId: string): Promise<ChatMessage[]> {
    return listMessages(sessionId)
  }

  @Handle("message:send") async sendUserMessage(sessionId: string, content: string): Promise<void> {
    if (!this.deps) throw new Error("chat service not ready")
    const members = listActiveMembers(sessionId)
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
      createdAtRemote: null,
    })
    this.emit("message:new", userMsg)
    await onNewMessage(this.deps, sessionId, userMsg)
  }

  @Handle("message:answer") async answerAsk(sessionId: string, input: AnswerAskInput): Promise<void> {
    if (!hasPending(input.pendingId)) throw new Error(`pending id ${input.pendingId} not found`)
    takePending(input.pendingId)
    await this.sendUserMessage(sessionId, input.answer)
  }

  // ========== member ==========
  @Handle("member:list") async listMembersHandler(sessionId: string): Promise<ChatMember[]> {
    return listMembers(sessionId)
  }

  @Handle("member:add") async addMember(sessionId: string, input: AddMemberInput): Promise<ChatMember> {
    const memberId = nanoid()
    const params = buildSessionInitParams({ sessionId, memberId, agentId: input.agentId, replyMode: input.replyMode })
    await this.createOpenClawSession(params.key, input.agentId, params.label)
    insertMember({ id: memberId, sessionId, agentId: input.agentId, openclawKey: params.key, replyMode: input.replyMode, seedHistory: input.seedHistory ?? false })
    const m = listMembers(sessionId).find((x) => x.id === memberId)
    if (!m) throw new Error("failed to load new member")
    return m
  }

  @Handle("member:remove") async removeMember(sessionId: string, memberId: string): Promise<void> {
    const m = listMembers(sessionId).find((x) => x.id === memberId)
    if (!m) return
    await this.deleteOpenClawSession(m.openclawKey).catch(() => { /* best effort */ })
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

  // ========== private ==========
  private buildBackend(): ChatBackend {
    return {
      send: async (params) => {
        await getGateway().call("chat.send", { sessionKey: params.sessionKey, message: params.message, idempotencyKey: params.idempotencyKey })
      },
      onEvent: (runId, listener) => {
        this.runListeners.set(runId, listener)
        return () => {
          this.runListeners.delete(runId)
        }
      },
      abort: async (params) => {
        await getGateway().call("chat.abort", { sessionKey: params.sessionKey, runId: params.runId })
      },
    }
  }

  private subscribeGatewayChatEvents(): void {
    const stream = getGateway().getStream()
    if (!stream) {
      log.warn("gateway stream not available yet; chat events won't be routed until connected")
      return
    }
    this.offGatewayEvents = stream.on("chat", (frame: EventFrame) => {
      const p = (frame.payload ?? {}) as ChatEventPayload
      const runId = p.runId
      if (!runId) return
      const listener = this.runListeners.get(runId)
      if (!listener) return
      const textJoin = (p.message?.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
      if (p.state === "delta") {
        listener({ kind: "delta", runId, content: textJoin })
      } else if (p.state === "final") {
        listener({ kind: "final", runId, content: textJoin, stopReason: p.stopReason, usage: p.usage as StepUsage | undefined })
      } else if (p.state === "aborted") {
        listener({ kind: "aborted", runId })
      } else if (p.state === "error") {
        listener({ kind: "error", runId, message: p.errorMessage ?? "unknown", errorKind: p.errorKind })
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

  private async createOpenClawSession(sessionKey: string, agentId: string, label?: string): Promise<void> {
    await getGateway().call("sessions.create", { key: sessionKey, agentId, label })
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
    try {
      const res = await getGateway().call<{ agents: Array<{ id: string; name?: string; identity?: { name?: string } }> }>("agents.list")
      const a = res.agents.find((x) => x.id === agentId)
      return a?.identity?.name ?? a?.name
    } catch {
      return undefined
    }
  }

  private findMemberByOpenClawKey(key: string): ChatMember | null {
    // 格式反解：kaiwu:chat:<sessionId>:<memberId>
    const parts = key.split(":")
    if (parts.length < 4 || parts[0] !== "kaiwu" || parts[1] !== "chat") return null
    const sessionId = parts[2]
    const memberId = parts[3]
    return listMembers(sessionId).find((m) => m.id === memberId) ?? null
  }
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
