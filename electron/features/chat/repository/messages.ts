/**
 * chat_messages 表数据访问。
 */

import { asc, eq } from "drizzle-orm"
import { database } from "../../../database/client"
import { chatMessages } from "../../../database/schema"
import type { ChatMention, ChatMessage, MessageRole, MessageUsage, SenderType } from "../types"

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
  inReplyToMessageId: string | null
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
      in_reply_to_message_id: m.inReplyToMessageId,
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

export function getMessageById(id: string): ChatMessage | null {
  const row = database().select().from(chatMessages).where(eq(chatMessages.id, id)).get()
  return row ? rowToMessage(row) : null
}

/** 分配 session 内下一个 seq(max+1,全新 session 从 1 开始)。 */
export function nextSeq(sessionId: string): number {
  const rows = database().select({ seq: chatMessages.seq }).from(chatMessages).where(eq(chatMessages.session_id, sessionId)).all()
  if (rows.length === 0) return 1
  return Math.max(...rows.map((r) => r.seq)) + 1
}

/** 取 session 内所有已登记的 openclaw_message_id(对账幂等查询)。 */
export function listOpenclawMessageIds(sessionId: string): Set<string> {
  const rows = database().select({ id: chatMessages.openclaw_message_id }).from(chatMessages).where(eq(chatMessages.session_id, sessionId)).all()
  const set = new Set<string>()
  for (const r of rows) if (r.id) set.add(r.id)
  return set
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
    inReplyToMessageId: row.in_reply_to_message_id ?? null,
    turnRunId: row.turn_run_id,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
    model: row.model ?? null,
    usage: row.usage_json ? (JSON.parse(row.usage_json) as MessageUsage) : null,
    stopReason: row.stop_reason ?? null,
    createdAtLocal: row.created_at_local,
    createdAtRemote: row.created_at_remote,
  }
}
