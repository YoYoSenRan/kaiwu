/**
 * `kaiwu_end_turn` agent 工具 — 显式结束本轮回复,不做任何后续动作。
 *
 * 用途:
 *   agent 完成任务 / 交付给其他 agent / 等待用户 后,调此工具告诉 runtime"我说完了"。
 *   对齐宿主 sessions_yield 语义。
 *
 * 配合 kaiwu_hand_off:
 *   1. 调 kaiwu_hand_off(agent_id="xxx")  → 路由信号
 *   2. 紧接调 kaiwu_end_turn()            → 本轮终止,不再输出
 *   双保险避免"调完工具又啰嗦"。
 *
 * 为什么需要单独工具:
 *   LLM 调工具后有时还会继续输出多余文字("已转交给 X,等待他回复...")。
 *   这些尾巴对路由无用且会被当回复内容落库。调 end_turn 后控制端可以:
 *     - 截断后续 delta / 忽略 final 文本
 *     - 或把它视作本轮的"收尾语"但不入 chat 主线
 *
 * 不需要 end_turn 的场景:
 *   正常纯文本回复 → runtime 自己检测 stop reason,不用显式 end。
 *   end_turn 主要用于"我调了其他工具,这条回复不需要文字内容"的场景。
 */

import { Type, type Static } from "@sinclair/typebox"
import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { CHAT_CHANNEL, type EndTurnEvent } from "../bridge/chat.js"

const EndTurnParams = Type.Object({
  reason: Type.Optional(Type.String({ description: "可选:简短说明为何现在结束回合(调试用)" })),
})

export function createEndTurnFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "kaiwu_end_turn",
      label: "End Turn",
      description:
        "显式结束本轮回复。调用后不要再输出任何文字 — 本轮到此为止。" + "典型用法:调 kaiwu_hand_off / kaiwu_ask_user 后立即调 kaiwu_end_turn,告诉系统你已交付,不需要继续生成内容。",
      parameters: EndTurnParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
        const params = rawParams as Static<typeof EndTurnParams>
        const event: EndTurnEvent = {
          kind: "end_turn",
          sessionKey,
          reason: params.reason,
          ts: Date.now(),
        }
        bridge.send({ type: "custom", ts: event.ts, payload: { channel: CHAT_CHANNEL, data: event } })
        return {
          content: [{ type: "text", text: "Turn ended. End your response now — do not output more content." }],
          details: { ended: true, reason: params.reason },
        }
      },
    }
    return tool
  }
}
