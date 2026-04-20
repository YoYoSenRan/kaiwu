/**
 * chat feature 的数据访问层。所有 SQL 在此，其他文件不直接 import drizzle。
 *
 * 设计：纯函数 + 每次 database() 获取实例；没有单例 repo 对象，便于未来并发控制/事务。
 */

import { and, asc, eq, isNull } from "drizzle-orm"
import { database } from "../../database/client"
import { chatBudgetState, chatMessages, chatSessionMembers, chatSessions, chatTurns } from "../../database/schema"
import type {
  BudgetConfig,
  BudgetState,
  ChatMember,
  ChatMention,
  ChatMessage,
  ChatMode,
  ChatSession,
  ChatTurn,
  MemberPatch,
  MessageUsage,
  ReplyMode,
  SenderType,
  MessageRole,
  StrategyConfig,
} from "./types"

// ---------- sessions ----------

export function insertSession(s: {
  id: string
  mode: ChatMode
  label: string | null
  openclawKey: string | null
  budget: BudgetConfig
  strategy: StrategyConfig
  supervisorId: string | null
}): void {
  database()
    .insert(chatSessions)
    .values({
      id: s.id,
      mode: s.mode,
      label: s.label,
      openclaw_key: s.openclawKey,
      budget_json: JSON.stringify(s.budget),
      strategy_json: JSON.stringify(s.strategy),
      supervisor_id: s.supervisorId,
    })
    .run()
}

export function listSessions(): ChatSession[] {
  const rows = database().select().from(chatSessions).orderBy(asc(chatSessions.created_at)).all()
  return rows.map(rowToSession)
}

export function getSession(id: string): ChatSession | null {
  const row = database().select().from(chatSessions).where(eq(chatSessions.id, id)).get()
  return row ? rowToSession(row) : null
}

export function setSessionArchived(id: string, archived: boolean): void {
  database().update(chatSessions).set({ archived }).where(eq(chatSessions.id, id)).run()
}

export function deleteSession(id: string): void {
  database().delete(chatSessions).where(eq(chatSessions.id, id)).run()
}

// ---------- members ----------

export function insertMember(m: { id: string; sessionId: string; agentId: string; openclawKey: string; replyMode: ReplyMode; seedHistory: boolean }): void {
  database()
    .insert(chatSessionMembers)
    .values({
      id: m.id,
      session_id: m.sessionId,
      agent_id: m.agentId,
      openclaw_key: m.openclawKey,
      reply_mode: m.replyMode,
      seed_history: m.seedHistory,
    })
    .run()
}

export function listMembers(sessionId: string): ChatMember[] {
  const rows = database().select().from(chatSessionMembers).where(eq(chatSessionMembers.session_id, sessionId)).orderBy(asc(chatSessionMembers.joined_at)).all()
  return rows.map(rowToMember)
}

export function listActiveMembers(sessionId: string): ChatMember[] {
  const rows = database()
    .select()
    .from(chatSessionMembers)
    .where(and(eq(chatSessionMembers.session_id, sessionId), isNull(chatSessionMembers.left_at)))
    .orderBy(asc(chatSessionMembers.joined_at))
    .all()
  return rows.map(rowToMember)
}

export function patchMember(id: string, patch: MemberPatch): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set: Record<string, any> = {}
  if (patch.replyMode) set.reply_mode = patch.replyMode
  database().update(chatSessionMembers).set(set).where(eq(chatSessionMembers.id, id)).run()
}

export function markMemberLeft(id: string): void {
  database().update(chatSessionMembers).set({ left_at: Date.now() }).where(eq(chatSessionMembers.id, id)).run()
}

// ---------- messages ----------

export function insertMessage(m: {
  id: string
  sessionId: string
  seq: number
  openclawSessionKey: string | null
  openclawMessageId: string | null
  senderType: SenderType
  senderId: string | null
  role: MessageRole
  content: unknown
  mentions: ChatMention[]
  turnRunId: string | null
  tags: string[]
  model: string | null
  usage: MessageUsage | null
  stopReason: string | null
  createdAtRemote: number | null
}): void {
  database()
    .insert(chatMessages)
    .values({
      id: m.id,
      session_id: m.sessionId,
      seq: m.seq,
      openclaw_session_key: m.openclawSessionKey,
      openclaw_message_id: m.openclawMessageId,
      sender_type: m.senderType,
      sender_id: m.senderId,
      role: m.role,
      content_json: JSON.stringify(m.content),
      mentions_json: JSON.stringify(m.mentions),
      turn_run_id: m.turnRunId,
      tags_json: JSON.stringify(m.tags),
      model: m.model,
      usage_json: m.usage ? JSON.stringify(m.usage) : null,
      stop_reason: m.stopReason,
      created_at_remote: m.createdAtRemote,
    })
    .run()
}

export function listMessages(sessionId: string): ChatMessage[] {
  const rows = database().select().from(chatMessages).where(eq(chatMessages.session_id, sessionId)).orderBy(asc(chatMessages.seq)).all()
  return rows.map(rowToMessage)
}

/** 分配 session 内下一个 seq（max+1，全新 session 从 1 开始）。 */
export function nextSeq(sessionId: string): number {
  const rows = database().select({ seq: chatMessages.seq }).from(chatMessages).where(eq(chatMessages.session_id, sessionId)).all()
  if (rows.length === 0) return 1
  return Math.max(...rows.map((r) => r.seq)) + 1
}

/** 取 session 内所有已登记的 openclaw_message_id（对账幂等查询）。 */
export function listOpenclawMessageIds(sessionId: string): Set<string> {
  const rows = database().select({ id: chatMessages.openclaw_message_id }).from(chatMessages).where(eq(chatMessages.session_id, sessionId)).all()
  const set = new Set<string>()
  for (const r of rows) if (r.id) set.add(r.id)
  return set
}

// ---------- budget ----------

export function upsertBudgetState(s: BudgetState): void {
  database()
    .insert(chatBudgetState)
    .values({
      session_id: s.sessionId,
      rounds_used: s.roundsUsed,
      tokens_used: s.tokensUsed,
      started_at: s.startedAt,
    })
    .onConflictDoUpdate({
      target: chatBudgetState.session_id,
      set: { rounds_used: s.roundsUsed, tokens_used: s.tokensUsed, started_at: s.startedAt },
    })
    .run()
}

export function getBudgetState(sessionId: string): BudgetState | null {
  const row = database().select().from(chatBudgetState).where(eq(chatBudgetState.session_id, sessionId)).get()
  return row ? { sessionId: row.session_id, roundsUsed: row.rounds_used, tokensUsed: row.tokens_used, startedAt: row.started_at, updatedAt: row.updated_at } : null
}

export function resetBudgetState(sessionId: string): void {
  database().delete(chatBudgetState).where(eq(chatBudgetState.session_id, sessionId)).run()
}

// ---------- turns ----------

export function insertTurn(r: {
  id: string
  sessionId: string
  memberId: string
  turnRunId: string
  sessionKey: string
  agentId: string
  model: string | null
  triggerMessageId: string | null
  systemPrompt: string
  historyText: string | null
  sentMessage: string
  sentAt: number
}): void {
  database()
    .insert(chatTurns)
    .values({
      id: r.id,
      session_id: r.sessionId,
      member_id: r.memberId,
      turn_run_id: r.turnRunId,
      session_key: r.sessionKey,
      agent_id: r.agentId,
      model: r.model,
      trigger_message_id: r.triggerMessageId,
      system_prompt: r.systemPrompt,
      history_text: r.historyText,
      sent_message: r.sentMessage,
      sent_at: r.sentAt,
    })
    .run()
}

export function listTurns(sessionId: string): ChatTurn[] {
  const rows = database().select().from(chatTurns).where(eq(chatTurns.session_id, sessionId)).orderBy(asc(chatTurns.sent_at)).all()
  return rows.map(rowToTurn)
}

export function getTurn(turnRunId: string): ChatTurn | null {
  const row = database().select().from(chatTurns).where(eq(chatTurns.turn_run_id, turnRunId)).get()
  return row ? rowToTurn(row) : null
}

// ---------- row → domain mappers ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(row: any): ChatSession {
  return {
    id: row.id,
    mode: row.mode,
    label: row.label,
    openclawKey: row.openclaw_key,
    budget: JSON.parse(row.budget_json) as BudgetConfig,
    strategy: JSON.parse(row.strategy_json) as StrategyConfig,
    supervisorId: row.supervisor_id,
    archived: !!row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMember(row: any): ChatMember {
  return {
    id: row.id,
    sessionId: row.session_id,
    agentId: row.agent_id,
    openclawKey: row.openclaw_key,
    replyMode: row.reply_mode,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    seedHistory: !!row.seed_history,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTurn(row: any): ChatTurn {
  return {
    id: row.id,
    sessionId: row.session_id,
    memberId: row.member_id,
    turnRunId: row.turn_run_id,
    sessionKey: row.session_key,
    agentId: row.agent_id,
    model: row.model ?? null,
    triggerMessageId: row.trigger_message_id ?? null,
    systemPrompt: row.system_prompt,
    historyText: row.history_text ?? null,
    sentMessage: row.sent_message,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMessage(row: any): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    seq: row.seq,
    openclawSessionKey: row.openclaw_session_key,
    openclawMessageId: row.openclaw_message_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    role: row.role,
    content: JSON.parse(row.content_json),
    mentions: row.mentions_json ? (JSON.parse(row.mentions_json) as ChatMention[]) : [],
    turnRunId: row.turn_run_id,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
    model: row.model ?? null,
    usage: row.usage_json ? (JSON.parse(row.usage_json) as MessageUsage) : null,
    stopReason: row.stop_reason ?? null,
    createdAtLocal: row.created_at_local,
    createdAtRemote: row.created_at_remote,
  }
}
