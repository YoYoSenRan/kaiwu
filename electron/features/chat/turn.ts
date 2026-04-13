import type { EngineRuntime } from "../../engine/runner"
import type { OrchestratorCallbacks, ChatSendInput, ChatMemberRow } from "./types"
import { scope } from "../../core/logger"
import { runAgent } from "../../engine/runner"
import { resolveConfig, buildStageContext } from "../../engine/context"
import { getChat, listMembers, insertPendingUserMessage, confirmMessage, failMessage, insertAgentMessageWithInvocation, updateMemberSessionKey } from "./crud"
import { syncMessages } from "./sync"

const log = scope("chat:turn")

/**
 * 处理单次 agent 对话：乐观写入用户消息 → 调用 runAgent → 对账补录。
 * @param controllers 活跃 AbortController 映射（chatId → controller）
 */
export async function handleSendMessage(
  runtime: EngineRuntime,
  callbacks: OrchestratorCallbacks,
  controllers: Map<string, AbortController>,
  input: ChatSendInput,
): Promise<void> {
  log.info(`sendMessage: chatId=${input.chatId}`)
  const chat = getChat(input.chatId)
  const members = listMembers(input.chatId)
  const member = members[0]
  if (!member) throw new Error("chat has no member")

  const config = resolveConfig(chat.config, member.config)
  const sessionKey = await ensureSession(runtime, input.chatId, member)
  log.info(`sessionKey=${sessionKey}, agentId=${member.agent_id}`)

  const userMsg = insertPendingUserMessage(input.chatId, input.content)
  const messageId = crypto.randomUUID()
  const role = getMemberRole(member.config)
  const ctx = buildStageContext(role, [], undefined)

  log.info("pushStageContext...")
  await runtime.pushStageContext(sessionKey, ctx)

  controllers.get(input.chatId)?.abort()
  const ac = new AbortController()
  controllers.set(input.chatId, ac)

  log.info("runAgent...")
  await runAgent(runtime, {
    sessionKey,
    agentId: member.agent_id,
    message: input.content,
    config,
    chatId: input.chatId,
    signal: ac.signal,
    onSendConfirmed: () => {
      log.info("send confirmed")
      confirmMessage(userMsg.id)
    },
    onToolEvent: (evt) => callbacks.onTool({ chatId: input.chatId, agentId: member.agent_id, ...evt }),
    onDelta: (text) => callbacks.onStream({ type: "delta", chatId: input.chatId, agentId: member.agent_id, messageId, content: text }),
    onFinal: (message, invocation) => {
      log.info(`final: ${message.slice(0, 100)}`)
      callbacks.onStream({ type: "final", chatId: input.chatId, agentId: member.agent_id, messageId, content: message, invocation })
      insertAgentMessageWithInvocation(input.chatId, member.agent_id, message, sessionKey, invocation)
    },
    onError: (err) => {
      log.error(`error: ${err.message}`)
      failMessage(userMsg.id)
      callbacks.onStream({ type: "error", chatId: input.chatId, agentId: member.agent_id, messageId, error: err.message })
    },
  })

  // agent 完成后自动 sync，补录中间的 tool 消息
  handleSyncChat(runtime, input.chatId).catch((err) => log.warn(`post-run sync failed: ${(err as Error).message}`))

  log.info("sendMessage done")
  controllers.delete(input.chatId)
}

/**
 * 拉取指定对话所有成员的远程历史并补录缺失消息。
 * @param chatId 对话 id
 */
export async function handleSyncChat(runtime: EngineRuntime, chatId: string): Promise<number> {
  const members = listMembers(chatId)
  let totalSynced = 0
  for (const member of members) {
    if (!member.session_key) continue
    try {
      const remote = await runtime.chatHistory(member.session_key)
      const synced = syncMessages(chatId, member.session_key, member.agent_id, remote)
      totalSynced += synced
    } catch (err) {
      log.warn(`对账失败 session=${member.session_key}: ${(err as Error).message}`)
    }
  }
  return totalSynced
}

/**
 * 确保成员有有效的 OpenClaw session key。
 * 首次发送时自动创建 session 并回写到 DB，后续复用已有 key。
 */
export async function ensureSession(runtime: EngineRuntime, chatId: string, member: ChatMemberRow): Promise<string> {
  if (member.session_key) {
    log.info(`复用已有 session: ${member.session_key}`)
    return member.session_key
  }
  log.info(`为 agent ${member.agent_id} 创建新 session...`)
  const { sessionKey } = await runtime.sessionCreate(member.agent_id, `kaiwu:chat:${chatId}`)
  log.info(`session 已创建: ${sessionKey}`)
  if (!sessionKey) throw new Error("sessionCreate returned empty sessionKey")
  updateMemberSessionKey(chatId, member.agent_id, sessionKey)
  return sessionKey
}

/** 从成员 config JSON 中提取 role 字段。 */
export function getMemberRole(memberConfig: string): string | undefined {
  try {
    const cfg = JSON.parse(memberConfig) as Record<string, unknown>
    return typeof cfg.role === "string" ? cfg.role : undefined
  } catch {
    return undefined
  }
}
