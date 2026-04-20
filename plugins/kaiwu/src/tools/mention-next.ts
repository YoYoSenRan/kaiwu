/**
 * `mention_next` agent 工具 — 把发言权交给群内其他成员。
 *
 * 仅调度型 agent(白名单里的)可调用。其他成员调用被拒绝,
 * 促使 LLM 在下一轮不再尝试。这是唯一的"agent → agent 路由"通道,
 * 正文里的 @<name> 只展示不触发。
 */

import { Type, type Static } from "@sinclair/typebox"
import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { CHAT_CHANNEL, type MentionNextEvent } from "../bridge/chat.js"

const MentionNextParams = Type.Object({
  agent_id: Type.String({ description: "被提及成员的 agent id" }),
  reason: Type.Optional(Type.String({ description: "可选:交接理由" })),
})

/** 仅允许这些 agent 调 mention_next。中心化调度,其他 agent 完成任务静默退出。 */
const ALLOWED_AGENTS = new Set<string>(["minion"])

export function createMentionNextFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const selfAgentId = ctx.agentId ?? ""
    const tool: AnyAgentTool = {
      name: "mention_next",
      label: "Mention Next Agent",
      description:
        "在群聊中把发言权交给另一个成员。调用后当前回合结束,被提及的成员会收到消息。" +
        "这是唯一的路由方式 — 在回复正文里写 @<name> 只用于引用/展示,不会触发对方接话。" +
        "仅调度型 agent(例如 minion)可调用,其他成员调用会被拒绝。",
      parameters: MentionNextParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
        if (!ALLOWED_AGENTS.has(selfAgentId)) {
          return {
            content: [
              {
                type: "text",
                text: `mention_next is only available to orchestrator agents. "${selfAgentId}" cannot route — complete your task and yield silently.`,
              },
            ],
            details: { rejected: true, reason: "agent not whitelisted", selfAgentId },
          }
        }
        const params = rawParams as Static<typeof MentionNextParams>
        const event: MentionNextEvent = {
          kind: "mention_next",
          sessionKey,
          agentId: params.agent_id,
          reason: params.reason,
          ts: Date.now(),
        }
        bridge.send({ type: "custom", ts: event.ts, payload: { channel: CHAT_CHANNEL, data: event } })
        return {
          content: [{ type: "text", text: `Mentioned ${event.agentId}.` }],
          details: { mentioned: event.agentId, reason: event.reason },
        }
      },
    }
    return tool
  }
}
