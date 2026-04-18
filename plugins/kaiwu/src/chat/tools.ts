/**
 * chat 域的 agent 工具工厂。
 *
 * 工具通过 OpenClawPluginToolFactory 暴露：每次被调度时 openclaw 传入 toolCtx
 * （含 sessionKey / agentId），工厂闭包捕获后返回一个 AnyAgentTool 实例。
 *
 * execute 里通过 bridge WS custom 通道推事件到 kaiwu，返回一个 ok 的 AgentToolResult。
 */

import { Type, type Static } from "@sinclair/typebox"
import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../core/transport.js"
import { CHAT_CHANNEL, type AskUserEvent, type MentionNextEvent } from "./contract.js"

const MentionNextParams = Type.Object({
  agent_id: Type.String({ description: "被提及成员的 agent id" }),
  reason: Type.Optional(Type.String({ description: "可选：交接理由" })),
})

const AskUserParams = Type.Object({
  question: Type.String({ description: "要向用户提的问题" }),
  options: Type.Optional(Type.Array(Type.String(), { description: "可选：给用户选的选项列表" })),
})

/** mention_next 工具：agent 把发言权交给另一个成员。 */
export function createMentionNextFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "mention_next",
      label: "Mention Next Agent",
      description: "在群聊中把发言权交给另一个成员。调用后当前回合结束，被提及的成员会收到消息。",
      parameters: MentionNextParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
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

/** ask_user 工具：agent 请求用户介入，群聊挂起等待用户回复。 */
export function createAskUserFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "ask_user",
      label: "Ask User",
      description: "需要用户回答问题或做选择时调用。调用后当前回合结束，群聊暂停等待用户回复。",
      parameters: AskUserParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
        const params = rawParams as Static<typeof AskUserParams>
        const event: AskUserEvent = {
          kind: "ask_user",
          sessionKey,
          question: params.question,
          options: params.options,
          ts: Date.now(),
        }
        bridge.send({ type: "custom", ts: event.ts, payload: { channel: CHAT_CHANNEL, data: event } })
        return {
          content: [{ type: "text", text: "Waiting for user input." }],
          details: { question: event.question, options: event.options },
        }
      },
    }
    return tool
  }
}
