/**
 * `ask_user` agent 工具 — 需要用户介入时调用,群聊挂起等待回复。
 *
 * 支持 options 参数,UI 端渲染为按钮组,一键回复(比自由打字快)。
 */

import { Type, type Static } from "@sinclair/typebox"
import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { CHAT_CHANNEL, type AskUserEvent } from "../bridge/chat.js"

const AskUserParams = Type.Object({
  question: Type.String({ description: "要向用户提的问题" }),
  options: Type.Optional(Type.Array(Type.String(), { description: "可选:给用户选的选项列表" })),
})

export function createAskUserFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "ask_user",
      label: "Ask User",
      description: "需要用户回答问题或做选择时调用。调用后当前回合结束,群聊暂停等待用户回复。",
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
