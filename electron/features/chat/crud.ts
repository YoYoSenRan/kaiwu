import { and, asc, desc, eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { getDb } from "../../db/client"
import { chatInvocations, chatMembers, chatMessages, chats } from "../../db/schema"
import { scope } from "../../core/logger"
import type { ChatCreateInput, ChatInvocationRow, ChatMemberAddInput, ChatMemberRow, ChatMessageRow, ChatRow } from "./types"
import type { InvocationData } from "../../engine/types"

const log = scope("chat")

// ---- Chats ----

/**
 * 列出所有对话，按最后更新时间倒序排列。
 */
export function listChats(): ChatRow[] {
  return getDb().select().from(chats).orderBy(desc(chats.updated_at)).all() as ChatRow[]
}

/**
 * 新建对话，同时插入成员记录。操作在同一事务内完成。
 * @param input 对话标题、模式和初始成员 agentId 列表
 */
export function createChat(input: ChatCreateInput): ChatRow {
  const id = crypto.randomUUID()
  const now = Date.now()
  const config = JSON.stringify(input.config ?? {})

  getDb().transaction(() => {
    getDb().insert(chats).values({ id, title: input.title, mode: input.mode, config, created_at: now, updated_at: now }).run()

    for (const agentId of input.agentIds) {
      getDb().insert(chatMembers).values({ chat_id: id, agent_id: agentId }).run()
    }
  })

  log.info(`对话已创建: ${id}`)
  const row = getDb().select().from(chats).where(eq(chats.id, id)).get()
  return row as ChatRow
}

/**
 * 删除对话（级联删除调用记录、消息和成员）。
 * @param id 对话 id
 */
export function deleteChat(id: string): void {
  getDb().transaction(() => {
    getDb().delete(chatInvocations).where(eq(chatInvocations.chat_id, id)).run()
    getDb().delete(chatMessages).where(eq(chatMessages.chat_id, id)).run()
    getDb().delete(chatMembers).where(eq(chatMembers.chat_id, id)).run()
    getDb().delete(chats).where(eq(chats.id, id)).run()
  })
  log.info(`对话已删除: ${id}`)
}

/**
 * 按 id 查单个对话，找不到时抛出错误。
 * @param id 对话 id
 */
export function getChat(id: string): ChatRow {
  const row = getDb().select().from(chats).where(eq(chats.id, id)).get()
  if (!row) throw new Error(`chat not found: ${id}`)
  return row as ChatRow
}

/**
 * 合并更新对话的 config JSON 字段，同时刷新 updated_at。
 * @param id 对话 id
 * @param config 要合并的配置键值对
 */
export function updateChatConfig(id: string, config: Record<string, unknown>): void {
  const row = getChat(id)
  const merged = JSON.stringify({ ...JSON.parse(row.config), ...config })
  getDb().update(chats).set({ config: merged, updated_at: Date.now() }).where(eq(chats.id, id)).run()
}

// ---- Messages ----

/**
 * 列出指定对话的所有消息，按发送时间升序排列。
 * @param chatId 对话 id
 */
export function listMessages(chatId: string): ChatMessageRow[] {
  return getDb().select().from(chatMessages).where(eq(chatMessages.chat_id, chatId)).orderBy(asc(chatMessages.created_at)).all() as ChatMessageRow[]
}

/**
 * 乐观写入用户消息（status='pending'），发送确认后再标记为 confirmed。
 * @param chatId 对话 id
 * @param content 消息正文
 */
export function insertPendingUserMessage(chatId: string, content: string): ChatMessageRow {
  const id = crypto.randomUUID()
  const now = Date.now()
  const hash = contentHash(content)

  getDb()
    .insert(chatMessages)
    .values({ id, chat_id: chatId, sender_type: "user", sender_agent_id: null, content, status: "pending", content_hash: hash, metadata: "{}", created_at: now })
    .run()
  getDb().update(chats).set({ updated_at: now }).where(eq(chats.id, chatId)).run()

  return getDb().select().from(chatMessages).where(eq(chatMessages.id, id)).get() as ChatMessageRow
}

/**
 * 标记 pending 消息为已确认。
 * @param messageId 消息 id
 */
export function confirmMessage(messageId: string): void {
  getDb().update(chatMessages).set({ status: "confirmed" }).where(eq(chatMessages.id, messageId)).run()
}

/**
 * 标记 pending 消息为发送失败。
 * @param messageId 消息 id
 */
export function failMessage(messageId: string): void {
  getDb().update(chatMessages).set({ status: "failed" }).where(eq(chatMessages.id, messageId)).run()
}

/**
 * 事务内同时写入 agent 消息和调用记录。
 * @param chatId 对话 id
 * @param agentId 发言的 agent id
 * @param content 回复正文
 * @param sessionKey OpenClaw session key
 * @param invocation 调用元数据
 */
export function insertAgentMessageWithInvocation(chatId: string, agentId: string, content: string, sessionKey: string, invocation: InvocationData): void {
  const msgId = crypto.randomUUID()
  const now = Date.now()
  const hash = contentHash(content)

  getDb().transaction(() => {
    getDb()
      .insert(chatMessages)
      .values({ id: msgId, chat_id: chatId, sender_type: "agent", sender_agent_id: agentId, content, status: "confirmed", invocation_id: invocation.runId, run_id: invocation.runId, content_hash: hash, metadata: "{}", created_at: now })
      .run()

    getDb()
      .insert(chatInvocations)
      .values({
        id: invocation.runId,
        chat_id: chatId,
        session_key: sessionKey,
        agent_id: agentId,
        model: invocation.model ?? null,
        provider: invocation.provider ?? null,
        input_tokens: invocation.inputTokens ?? null,
        output_tokens: invocation.outputTokens ?? null,
        cache_read: invocation.cacheRead ?? null,
        cache_write: invocation.cacheWrite ?? null,
        cost: invocation.cost ?? null,
        stop_reason: invocation.stopReason ?? null,
        raw: invocation.raw,
        created_at: now,
      })
      .run()

    getDb().update(chats).set({ updated_at: now }).where(eq(chats.id, chatId)).run()
  })
}

// ---- Invocations ----

/**
 * 列出指定对话的所有调用记录，按时间升序。
 * @param chatId 对话 id
 */
export function listInvocations(chatId: string): ChatInvocationRow[] {
  return getDb().select().from(chatInvocations).where(eq(chatInvocations.chat_id, chatId)).orderBy(asc(chatInvocations.created_at)).all() as ChatInvocationRow[]
}

/**
 * 检查指定 invocation 是否存在。
 * @param invocationId invocation id（即 run_id）
 */
export function invocationExists(invocationId: string): boolean {
  const row = getDb().select({ id: chatInvocations.id }).from(chatInvocations).where(eq(chatInvocations.id, invocationId)).get()
  return !!row
}

// ---- Members ----

/**
 * 列出指定对话的所有成员。
 * @param chatId 对话 id
 */
export function listMembers(chatId: string): ChatMemberRow[] {
  return getDb().select().from(chatMembers).where(eq(chatMembers.chat_id, chatId)).all() as ChatMemberRow[]
}

/**
 * 向对话中添加一个成员。
 * @param input 包含 chatId、agentId 和可选 config
 */
export function addMember(input: ChatMemberAddInput): void {
  const config = JSON.stringify(input.config ?? {})
  getDb().insert(chatMembers).values({ chat_id: input.chatId, agent_id: input.agentId, config }).run()
}

/**
 * 更新成员的 session key（首次 chat.send 前自动创建 session 后回写）。
 * @param chatId 对话 id
 * @param agentId agent id
 * @param sessionKey 新的 session key
 */
export function updateMemberSessionKey(chatId: string, agentId: string, sessionKey: string): void {
  getDb()
    .update(chatMembers)
    .set({ session_key: sessionKey })
    .where(and(eq(chatMembers.chat_id, chatId), eq(chatMembers.agent_id, agentId)))
    .run()
}

/**
 * 从对话中移除一个成员。
 * @param chatId 对话 id
 * @param agentId 要移除的 agent id
 */
export function removeMember(chatId: string, agentId: string): void {
  getDb()
    .delete(chatMembers)
    .where(and(eq(chatMembers.chat_id, chatId), eq(chatMembers.agent_id, agentId)))
    .run()
}

// ---- 工具 ----

/**
 * 从消息 content 提取纯文本后计算 SHA-256 前 16 位 hex。用于对账去重。
 * @param content 消息正文
 */
export function contentHash(content: string): string {
  const text = extractText(content)
  return createHash("sha256").update(text.slice(0, 100)).digest("hex").slice(0, 16)
}

/**
 * 从 OpenClaw 远程消息中提取纯文本。
 * @param content 远程消息的 content 字段
 */
export function extractText(content: unknown): string {
  if (typeof content === "string") {
    if (content.startsWith("[")) {
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) return extractText(parsed)
      } catch {
        /* 不是合法 JSON，当纯文本 */
      }
    }
    return content
  }
  if (!Array.isArray(content)) return ""
  return (content as Array<{ type?: string; text?: string }>)
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("")
}
