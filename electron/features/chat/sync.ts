import { and, eq, sql } from "drizzle-orm"
import { getDb } from "../../db/client"
import { chatMessages, chats } from "../../db/schema"
import { scope } from "../../core/logger"
import { contentHash, extractText, insertAgentMessageWithInvocation, invocationExists } from "./crud"
import type { InvocationData } from "../../engine/types"

const log = scope("chat:sync")

/**
 * 与 OpenClaw 对账：补录缺失的消息和调用记录。
 * 去重策略：assistant 消息靠 content_hash，user 消息靠 content_hash + timestamp ±10s 容差。
 * @param chatId 对话 id
 * @param sessionKey 该成员的 session key
 * @param agentId 该成员的 agent id
 * @param remoteMessages chat.history 返回的消息列表
 */
export function syncMessages(
  chatId: string,
  sessionKey: string,
  agentId: string,
  remoteMessages: Array<{ role: string; content: unknown; timestamp?: number; [k: string]: unknown }>,
): number {
  let synced = 0
  const TOLERANCE_MS = 10_000
  const emptyHash = contentHash("")

  for (const remote of remoteMessages) {
    const ts = typeof remote.timestamp === "number" ? remote.timestamp : 0
    const text = extractText(remote.content)
    const rawContent = Array.isArray(remote.content) ? JSON.stringify(remote.content) : typeof remote.content === "string" ? remote.content : text
    const hash = contentHash(rawContent)

    // 跳过空内容和纯 thinking 消息
    if (hash === emptyHash && !text) continue

    const oc = remote.__openclaw as { id?: string; seq?: number } | undefined

    // 判断消息归属：assistant/tool role，或 content 含 tool blocks，或有 toolCallId
    const contentBlocks = Array.isArray(remote.content) ? (remote.content as Array<{ type?: string }>) : []
    const hasToolBlocks = contentBlocks.some((b) => b.type === "tool_use" || b.type === "tool_result")
    const hasToolCallId = typeof remote.toolCallId === "string" || typeof remote.tool_call_id === "string"
    const isAgentSide = remote.role === "assistant" || remote.role === "tool" || hasToolBlocks || hasToolCallId

    if (isAgentSide) {
      // agent 侧去重：按 content_hash 匹配
      const existing = getDb()
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(and(eq(chatMessages.chat_id, chatId), eq(chatMessages.sender_type, "agent"), eq(chatMessages.content_hash, hash)))
        .get()
      if (existing) continue

      const hasUsage = remote.usage && typeof (remote.usage as Record<string, unknown>).input === "number"
      const isToolMsg = hasToolBlocks || hasToolCallId || !hasUsage

      if (isToolMsg) {
        // tool 消息或无 usage 的中间消息——只插 message
        getDb()
          .insert(chatMessages)
          .values({
            id: crypto.randomUUID(),
            chat_id: chatId,
            sender_type: "agent",
            sender_agent_id: agentId,
            content: rawContent,
            status: "confirmed",
            content_hash: hash,
            remote_seq: oc?.seq ?? null,
            metadata: JSON.stringify({ synced: true }),
            created_at: ts || Date.now(),
          })
          .run()
        synced++
      } else {
        // LLM 调用——有 usage，建 message + invocation
        const remoteId = oc?.id ?? ""
        if (remoteId && invocationExists(remoteId)) continue

        const usage = (remote.usage ?? {}) as Record<string, unknown>
        const cost = (usage.cost ?? {}) as Record<string, unknown>
        const invocation: InvocationData = {
          runId: remoteId || crypto.randomUUID(),
          model: typeof remote.model === "string" ? remote.model : undefined,
          provider: typeof remote.provider === "string" ? remote.provider : undefined,
          inputTokens: typeof usage.input === "number" ? usage.input : undefined,
          outputTokens: typeof usage.output === "number" ? usage.output : undefined,
          cacheRead: typeof usage.cacheRead === "number" ? usage.cacheRead : undefined,
          cacheWrite: typeof usage.cacheWrite === "number" ? usage.cacheWrite : undefined,
          cost: typeof cost.total === "number" ? cost.total : undefined,
          stopReason: typeof remote.stopReason === "string" ? remote.stopReason : undefined,
          raw: JSON.stringify(remote),
        }
        insertAgentMessageWithInvocation(chatId, agentId, rawContent, sessionKey, invocation)
        synced++
      }
    } else {
      // user 消息——content_hash + 时间容差去重
      const existing = getDb()
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.chat_id, chatId),
            eq(chatMessages.sender_type, "user"),
            eq(chatMessages.content_hash, hash),
            sql`${chatMessages.created_at} BETWEEN ${ts - TOLERANCE_MS} AND ${ts + TOLERANCE_MS}`,
          ),
        )
        .get()
      if (existing) continue

      getDb()
        .insert(chatMessages)
        .values({
          id: crypto.randomUUID(),
          chat_id: chatId,
          sender_type: "user",
          sender_agent_id: null,
          content: text,
          status: "confirmed",
          content_hash: hash,
          remote_seq: oc?.seq ?? null,
          metadata: JSON.stringify({ synced: true }),
          created_at: ts || Date.now(),
        })
        .run()
      synced++
    }
  }

  if (synced > 0) {
    getDb().update(chats).set({ updated_at: Date.now() }).where(eq(chats.id, chatId)).run()
    log.info(`对账补录 ${synced} 条消息: chatId=${chatId}`)
  }
  return synced
}
