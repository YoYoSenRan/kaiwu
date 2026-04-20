/**
 * @Handle("message:*" | "member:*") 处理器集中地。
 *
 * message 与 member 操作合并:都围绕 session 内成员/消息做增删改读。
 */

import { nanoid } from "nanoid"
import { scope } from "../../../infra/logger"
import { buildSessionInitParams } from "../keys"
import { getSession, insertMember, insertMessage, listActiveMembers, listMembers, listMessages, markMemberLeft, nextSeq, patchMember as patchMemberRow } from "../repository"
import { hasPending, onNewMessage, takePending } from "../loops"
import { parseMentionsFromText, sanitizeStructuredMentions } from "../routing"
import { getGateway } from "../../openclaw/runtime"
import type { AddMemberInput, AnswerAskInput, ChatMember, ChatMention, ChatMessage, MemberPatch } from "../types"
import type { ChatService } from "../service"

const log = scope("chat:ipc:message")

export async function list(sessionId: string): Promise<ChatMessage[]> {
  return listMessages(sessionId)
}

export async function send(svc: ChatService, sessionId: string, content: string, mentions?: ChatMention[], inReplyToMessageId?: string): Promise<void> {
  log.info(`send sessionId=${sessionId} contentLen=${content.length} mentionsLen=${mentions?.length ?? 0} inReplyTo=${inReplyToMessageId ?? "-"}`)
  if (!svc.deps) throw new Error("chat service not ready")
  if (!content.trim()) throw new Error("message content is empty")
  const preSession = getSession(sessionId)
  if (!preSession) throw new Error(`session ${sessionId} not found`)
  if (preSession.archived) throw new Error(`session ${sessionId} is archived`)
  const members = listActiveMembers(sessionId)
  if (members.length === 0) throw new Error(`session ${sessionId} has no active members`)

  const structuredMentions = mentions && mentions.length > 0 ? sanitizeStructuredMentions(content, mentions, members) : []
  const effectiveMentions = structuredMentions.length > 0 ? structuredMentions : parseMentionsFromText(content, members)
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
    mentions: effectiveMentions,
    inReplyToMessageId: inReplyToMessageId ?? null,
    turnRunId: null,
    tags: [],
    model: null,
    usage: null,
    stopReason: null,
    createdAtLocal: Date.now(),
    createdAtRemote: null,
  }
  insertMessage(userMsg)
  svc.emitMessageNew(userMsg)

  // 不再分支 direct/group:onNewMessage 内部按 session.mode 决定要不要 pushContext / 是否递归
  await onNewMessage(svc.deps, sessionId, userMsg)
}

export async function answer(svc: ChatService, sessionId: string, input: AnswerAskInput): Promise<void> {
  if (!hasPending(input.pendingId)) throw new Error(`pending id ${input.pendingId} not found`)
  takePending(input.pendingId)
  await send(svc, sessionId, input.answer)
}

export async function abort(svc: ChatService, sessionId: string): Promise<{ aborted: number }> {
  const keys = svc.activeKeysBySession.get(sessionId)
  if (!keys || keys.size === 0) return { aborted: 0 }
  const uniqueSessionKeys = new Set<string>()
  for (const key of keys) {
    const sk = svc.sessionKeyByKey.get(key)
    if (sk) uniqueSessionKeys.add(sk)
  }
  await Promise.allSettled(
    Array.from(uniqueSessionKeys).map((sessionKey) =>
      getGateway()
        .call("chat.abort", { sessionKey })
        .catch((err) => log.warn(`chat.abort failed sessionKey=${sessionKey}: ${(err as Error).message}`)),
    ),
  )
  return { aborted: keys.size }
}

// ---------- member:* ----------

export async function memberList(sessionId: string): Promise<ChatMember[]> {
  return listMembers(sessionId)
}

export async function memberAdd(svc: ChatService, sessionId: string, input: AddMemberInput): Promise<ChatMember> {
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

export async function memberRemove(svc: ChatService, sessionId: string, memberId: string): Promise<void> {
  const m = listMembers(sessionId).find((x) => x.id === memberId)
  if (!m) return
  await svc.deleteOpenClawSession(m.openclawKey).catch(() => {
    /* best effort */
  })
  markMemberLeft(memberId)
}

export async function memberPatch(sessionId: string, memberId: string, p: MemberPatch): Promise<ChatMember> {
  patchMemberRow(memberId, p)
  const m = listMembers(sessionId).find((x) => x.id === memberId)
  if (!m) throw new Error("member not found after patch")
  return m
}
