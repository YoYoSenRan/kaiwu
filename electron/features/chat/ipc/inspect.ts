/**
 * @Handle("inspect:*") 处理器 — 会话追踪页聚合拉取。
 */

import { getSession, getTurn, listMembers, listMessages, listTurns } from "../repository"
import type { ChatSessionDetail, ChatTurn } from "../types"

export async function getSessionDetail(sessionId: string): Promise<ChatSessionDetail | null> {
  const session = getSession(sessionId)
  if (!session) return null
  return {
    session,
    members: listMembers(sessionId),
    messages: listMessages(sessionId),
    turns: listTurns(sessionId),
  }
}

export async function getTurnHandler(turnRunId: string): Promise<ChatTurn | null> {
  return getTurn(turnRunId)
}
