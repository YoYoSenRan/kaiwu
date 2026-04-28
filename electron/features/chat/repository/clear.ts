/**
 * 清空所有聊天相关表(调试/重置用)。不动 schema,只 DELETE 行。
 * 顺序按 FK 依赖自底向上:依赖者先清,被依赖者后清。
 */

import { database } from "../../../database/client"
import { chatBudgetState, chatMessages, chatSessionMembers, chatSessions, chatTurns } from "../../../database/schema"

export function clearAllChatTables(): { cleared: Record<string, number> } {
  const db = database()
  const cleared: Record<string, number> = {}
  const before = (table: typeof chatTurns | typeof chatBudgetState | typeof chatMessages | typeof chatSessionMembers | typeof chatSessions): number => {
    return db.select().from(table).all().length
  }
  cleared.chat_turns = before(chatTurns)
  db.delete(chatTurns).run()
  cleared.chat_budget_state = before(chatBudgetState)
  db.delete(chatBudgetState).run()
  cleared.chat_messages = before(chatMessages)
  db.delete(chatMessages).run()
  cleared.chat_session_members = before(chatSessionMembers)
  db.delete(chatSessionMembers).run()
  cleared.chat_sessions = before(chatSessions)
  db.delete(chatSessions).run()
  return { cleared }
}
