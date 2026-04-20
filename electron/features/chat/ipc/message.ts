/**
 * @Handle("message:*") 处理器。
 */

import { nanoid } from "nanoid"
import { scope } from "../../../infra/logger"
import { getSession, insertMessage, listActiveMembers, listMessages, nextSeq } from "../repository"
import { hasPending, onNewMessage, sendDirect, takePending } from "../loops"
import { parseMentionsFromText, sanitizeStructuredMentions } from "../routing"
import { getGateway } from "../../openclaw/runtime"
import type { AnswerAskInput, ChatMention, ChatMessage } from "../types"
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
    inReplyToMessageId: userMsg.inReplyToMessageId,
    turnRunId: null,
    tags: [],
    model: null,
    usage: null,
    stopReason: null,
    createdAtRemote: null,
  })
  svc.emitMessageNew(userMsg)

  if (preSession.mode === "direct") {
    if (!svc.directDeps) throw new Error("direct deps not ready")
    await sendDirect(svc.directDeps, sessionId, userMsg)
  } else {
    await onNewMessage(svc.deps, sessionId, userMsg)
  }
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
