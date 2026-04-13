import type { EngineRuntime } from "../../engine/runner"
import type { ResolvedConfig } from "../../engine/types"
import type { OrchestratorCallbacks, ChatMemberRow } from "./types"
import { runAgent } from "../../engine/runner"
import { nextSpeaker, isRoundComplete } from "../../engine/strategy"
import { resolveConfig, buildStageContext, formatSharedTranscript } from "../../engine/context"
import { getChat, listMembers, insertPendingUserMessage, confirmMessage, insertAgentMessageWithInvocation, listMessages } from "./crud"
import { ensureSession, getMemberRole } from "./turn"

type PauseHandle = { promise: Promise<void>; resolve: () => void }

/**
 * 启动圆桌讨论：插入主题消息后循环执行多轮发言，直到达到 maxRounds 或被中止。
 * @param controllers 活跃 AbortController 映射
 * @param pausePromises 暂停 Promise 映射
 */
export async function handleStartRoundtable(
  runtime: EngineRuntime,
  callbacks: OrchestratorCallbacks,
  controllers: Map<string, AbortController>,
  pausePromises: Map<string, PauseHandle>,
  chatId: string,
  topic: string,
): Promise<void> {
  const chat = getChat(chatId)
  const members = listMembers(chatId)
  if (members.length === 0) throw new Error("roundtable has no members")

  const config = resolveConfig(chat.config)
  const topicMsg = insertPendingUserMessage(chatId, topic)
  confirmMessage(topicMsg.id)

  controllers.get(chatId)?.abort()
  const ac = new AbortController()
  controllers.set(chatId, ac)

  try {
    await runRounds(runtime, callbacks, pausePromises, ac, chatId, topic, members, config)
  } finally {
    controllers.delete(chatId)
    callbacks.onRoundtable({ chatId, type: "stopped" })
  }
}

async function runRounds(
  runtime: EngineRuntime,
  callbacks: OrchestratorCallbacks,
  pausePromises: Map<string, PauseHandle>,
  ac: AbortController,
  chatId: string,
  topic: string,
  members: ChatMemberRow[],
  config: ResolvedConfig,
): Promise<void> {
  const speakerList: Array<{ agentId: string; sessionKey: string }> = []
  for (const m of members) {
    const sk = await ensureSession(runtime, chatId, m)
    speakerList.push({ agentId: m.agent_id, sessionKey: sk })
  }

  for (let round = 0; round < config.maxRounds; round++) {
    if (ac.signal.aborted) return
    callbacks.onRoundtable({ chatId, type: "round-start", round })
    let lastSpeakerIndex = -1

    for (let turn = 0; turn < speakerList.length; turn++) {
      const pending = pausePromises.get(chatId)
      if (pending) await pending.promise
      if (ac.signal.aborted) return

      const decision = nextSpeaker(config.turnStrategy, speakerList, lastSpeakerIndex)
      lastSpeakerIndex = speakerList.findIndex((s) => s.agentId === decision.agentId)
      const member = members.find((m) => m.agent_id === decision.agentId)!

      callbacks.onRoundtable({ chatId, type: "turn-start", round, agentId: decision.agentId })
      await runSingleTurn(runtime, callbacks, ac, chatId, topic, member, decision.sessionKey, config)
      callbacks.onRoundtable({ chatId, type: "turn-end", round, agentId: decision.agentId })

      if (isRoundComplete(speakerList.length, turn)) break
    }

    callbacks.onRoundtable({ chatId, type: "round-end", round })
  }
}

async function runSingleTurn(
  runtime: EngineRuntime,
  callbacks: OrchestratorCallbacks,
  ac: AbortController,
  chatId: string,
  topic: string,
  member: ChatMemberRow,
  sessionKey: string,
  config: ResolvedConfig,
): Promise<void> {
  const recent = listMessages(chatId)
  const transcript = formatSharedTranscript(recent.map((m) => ({ senderLabel: m.sender_agent_id ?? m.sender_type, content: m.content })))
  const role = getMemberRole(member.config)
  const ctx = buildStageContext(role, [], transcript || undefined)
  await runtime.pushStageContext(sessionKey, ctx)

  const messageId = crypto.randomUUID()

  await runAgent(runtime, {
    sessionKey,
    config,
    chatId,
    message: topic,
    agentId: member.agent_id,
    signal: ac.signal,
    onToolEvent: (evt) => callbacks.onTool({ chatId, agentId: member.agent_id, ...evt }),
    onDelta: (text) => callbacks.onStream({ type: "delta", chatId, agentId: member.agent_id, messageId, content: text }),
    onFinal: (message, invocation) => {
      callbacks.onStream({ type: "final", chatId, agentId: member.agent_id, messageId, content: message, invocation })
      insertAgentMessageWithInvocation(chatId, member.agent_id, message, sessionKey, invocation)
    },
    onError: (err) => callbacks.onStream({ type: "error", chatId, agentId: member.agent_id, messageId, error: err.message }),
  })
}

/** 暂停圆桌：挂起运行循环直到 resume 被调用。 */
export function handlePause(
  callbacks: OrchestratorCallbacks,
  pausePromises: Map<string, PauseHandle>,
  chatId: string,
): void {
  let resolve: () => void
  const promise = new Promise<void>((r) => { resolve = r })
  pausePromises.set(chatId, { promise, resolve: resolve! })
  callbacks.onRoundtable({ chatId, type: "paused" })
}

/** 恢复已暂停的圆桌。 */
export function handleResume(
  callbacks: OrchestratorCallbacks,
  pausePromises: Map<string, PauseHandle>,
  chatId: string,
): void {
  pausePromises.get(chatId)?.resolve()
  pausePromises.delete(chatId)
  callbacks.onRoundtable({ chatId, type: "resumed" })
}

/**
 * 停止圆桌（先解除暂停阻塞，否则 runRounds 会永远挂在 await pending.promise）。
 */
export function handleStop(
  controllers: Map<string, AbortController>,
  pausePromises: Map<string, PauseHandle>,
  chatId: string,
): void {
  const pending = pausePromises.get(chatId)
  if (pending) {
    pending.resolve()
    pausePromises.delete(chatId)
  }
  const ac = controllers.get(chatId)
  if (!ac) return
  ac.abort()
  controllers.delete(chatId)
}
