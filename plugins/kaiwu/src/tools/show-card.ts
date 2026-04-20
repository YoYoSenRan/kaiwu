/**
 * `kaiwu_show_card` agent 工具 — 让 agent 在回复里嵌入交互卡片(按钮组)。
 *
 * 用途:
 *   agent 想让用户做结构化选择(而非自由打字)时调此工具。
 *   例:"下一步是 A 还是 B" → 发俩按钮,用户点一下即作为下一条 user msg 发回。
 *
 * 和 ```card``` fence 解析的关系:
 *   两者并存,效果一样。tool 调用参数强类型,更确定;fence 适合 LLM 自然吐 JSON。
 *   推荐路径:agent 可靠场景用 tool,fallback 走 fence。
 *
 * 对比 kaiwu_ask_user:
 *   kaiwu_ask_user  → 挂起群聊,必须等用户回复才继续
 *   kaiwu_show_card → 不挂起,卡片只是本轮回复的增强展示;用户点或不点都可以
 */

import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { CHAT_CHANNEL, type ShowCardEvent } from "../bridge/chat.js"

const ShowCardParams = {
  type: "object",
  properties: {
    title: { type: "string", description: "卡片标题(可选)" },
    description: { type: "string", description: "标题下的说明文字(可选)" },
    options: {
      type: "array",
      description: "按钮选项列表。至少 1 个。",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "按钮上显示的文字" },
          value: { type: "string", description: "点击后作为新消息发回给你的文本内容" },
          style: { type: "string", enum: ["primary", "default", "danger"], description: "按钮样式" },
        },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
  },
  required: ["options"],
  additionalProperties: false,
} as never

interface ShowCardArgs {
  title?: string
  description?: string
  options: Array<{ label: string; value: string; style?: "primary" | "default" | "danger" }>
}

export function createShowCardFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "kaiwu_show_card",
      label: "Show Card",
      description:
        "在回复里嵌入一个结构化交互卡片(按钮组)。用户点击按钮后,按钮的 value 会作为新消息自动发回给你。" +
        "适合让用户做结构化选择(A/B/C/确认/取消),比让用户打字更快。" +
        "不会挂起对话 — 卡片只是本轮回复的附加展示。需要强制等待用户输入请用 kaiwu_ask_user。",
      parameters: ShowCardParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
        const params = rawParams as ShowCardArgs
        if (!params.options || params.options.length === 0) {
          return {
            content: [{ type: "text", text: "kaiwu_show_card failed: options array must contain at least one entry." }],
            details: { rejected: true, reason: "empty options" },
          }
        }
        const event: ShowCardEvent = {
          kind: "show_card",
          sessionKey,
          title: params.title,
          description: params.description,
          options: params.options,
          ts: Date.now(),
        }
        bridge.send({ type: "custom", ts: event.ts, payload: { channel: CHAT_CHANNEL, data: event } })
        return {
          content: [{ type: "text", text: `Card with ${params.options.length} option(s) rendered.` }],
          details: { optionsCount: params.options.length },
        }
      },
    }
    return tool
  }
}
