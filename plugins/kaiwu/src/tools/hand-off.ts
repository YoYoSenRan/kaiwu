/**
 * `kaiwu_hand_off` agent 工具 — 把发言权交给群内另一个成员。
 *
 * 用途:
 *   群聊中当前 agent 完成自己那一步,要让另一个成员接下去做。
 *   调此工具等于"我说完了,接下来 X 讲"。
 *
 * 路由规则:
 *   这是唯一的路由方式 — 在回复正文里写 @<name> 只展示不触发。
 *   仅白名单里的调度型 agent 可调,其他 agent 调用会被拒绝。
 *
 * 配合 kaiwu_end_turn:
 *   调 hand_off 后立即调 end_turn,告诉系统"本轮到此结束",不要再生成文字。
 *   双保险避免 LLM 在 hand_off 后继续输出啰嗦尾巴。
 */

import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { CHAT_CHANNEL, type HandOffEvent } from "../bridge/chat.js"

const HandOffParams = {
  type: "object",
  properties: {
    agent_id: { type: "string", description: "要交接给的成员 agent id" },
    reason: { type: "string", description: "可选:交接理由" },
  },
  required: ["agent_id"],
  additionalProperties: false,
} as never

interface HandOffArgs {
  agent_id: string
  reason?: string
}

export function createHandOffFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "kaiwu_hand_off",
      label: "Hand Off",
      description: "把群聊发言权交给另一个成员。调用后当前回合结束,被交接的成员会收到消息。" + "若你不是本群主持人(supervisor),调用会被静默忽略 — 完成自己任务即可,不必尝试。",
      parameters: HandOffParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
        const params = rawParams as HandOffArgs
        const event: HandOffEvent = {
          kind: "hand_off",
          sessionKey,
          agentId: params.agent_id,
          reason: params.reason,
          ts: Date.now(),
        }
        bridge.send({ type: "custom", ts: event.ts, payload: { channel: CHAT_CHANNEL, data: event } })
        return {
          content: [{ type: "text", text: `Handed off to ${event.agentId}.` }],
          details: { handedOff: event.agentId, reason: event.reason },
        }
      },
    }
    return tool
  }
}
