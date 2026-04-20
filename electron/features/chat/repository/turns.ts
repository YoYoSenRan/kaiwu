/**
 * chat_turns 表数据访问:agent 每次 chat.send 的运行快照。
 */

import { asc, eq } from "drizzle-orm"
import { database } from "../../../database/client"
import { chatTurns } from "../../../database/schema"
import type { ChatTurn } from "../types"

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
