/**
 * @Handle("member:*") 处理器。
 */

import { nanoid } from "nanoid"
import { buildSessionInitParams } from "../bootstrap"
import { getSession, insertMember, listMembers, markMemberLeft, patchMember as patchMemberRow } from "../repository"
import type { AddMemberInput, ChatMember, MemberPatch } from "../types"
import type { ChatService } from "../service"

export async function list(sessionId: string): Promise<ChatMember[]> {
  return listMembers(sessionId)
}

export async function add(svc: ChatService, sessionId: string, input: AddMemberInput): Promise<ChatMember> {
  const session = getSession(sessionId)
  if (!session) throw new Error(`session ${sessionId} not found`)
  const memberId = nanoid()
  const params = buildSessionInitParams({ sessionId, memberId, agentId: input.agentId, mode: session.mode, replyMode: input.replyMode })
  await svc.createOpenClawSession(params.key, input.agentId)
  insertMember({ id: memberId, sessionId, agentId: input.agentId, openclawKey: params.key, replyMode: input.replyMode, seedHistory: input.seedHistory ?? false })
  const m = listMembers(sessionId).find((x) => x.id === memberId)
  if (!m) throw new Error("failed to load new member")
  return m
}

export async function remove(svc: ChatService, sessionId: string, memberId: string): Promise<void> {
  const m = listMembers(sessionId).find((x) => x.id === memberId)
  if (!m) return
  await svc.deleteOpenClawSession(m.openclawKey).catch(() => {
    /* best effort */
  })
  markMemberLeft(memberId)
}

export async function patch(sessionId: string, memberId: string, p: MemberPatch): Promise<ChatMember> {
  patchMemberRow(memberId, p)
  const m = listMembers(sessionId).find((x) => x.id === memberId)
  if (!m) throw new Error("member not found after patch")
  return m
}
