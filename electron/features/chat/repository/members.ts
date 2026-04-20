/**
 * chat_session_members 表数据访问。
 */

import { and, asc, eq, isNull } from "drizzle-orm"
import { database } from "../../../database/client"
import { chatSessionMembers } from "../../../database/schema"
import type { ChatMember, MemberPatch, ReplyMode } from "../types"

export function insertMember(m: {
  id: string
  sessionId: string
  agentId: string
  openclawKey: string
  replyMode: ReplyMode
  seedHistory: boolean
}): void {
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
