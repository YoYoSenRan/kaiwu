/**
 * `kaiwu_set_status` agent 工具 — agent 主动标记自身状态,供 UI 渲染提示。
 *
 * 用途:
 *   agent 在做耗时工作(分析、调 browser、遍历文件)时调此工具告诉 UI
 *   "我正在 X,别以为我卡住了"。UI 可显 typing indicator / spinner + 提示文案。
 *
 * 状态语义:
 *   thinking  — 纯思考(reasoning 态)
 *   working   — 在用工具做事(scan/fetch/compute)
 *   waiting   — 等外部响应(tool result / HTTP / 用户)
 *   idle      — 空闲(主动清除前置状态)
 *
 * 和 delivery chip 的关系:
 *   delivery chip 由控制端根据事件**被动**推断(queued/thinking/tool/replying/done)。
 *   set_status 是 agent **主动**声明,粒度更细、语义更准,可以和 chip 并存/替代。
 *
 * 调用频率建议:
 *   - 任务开始 → kaiwu_set_status("working", hint: "扫描项目文件")
 *   - 阶段切换 → kaiwu_set_status("thinking", hint: "汇总发现")
 *   - 产出前  → kaiwu_set_status("idle") 或直接不调,由 reply 自然覆盖
 *   不要每句话都调 — 变化时才调。
 */

import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { CHAT_CHANNEL, type SetStatusEvent } from "../bridge/chat.js"

const SetStatusParams = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["thinking", "working", "waiting", "idle"], description: "当前状态" },
    hint: { type: "string", description: "可选:给用户的提示文案,如 '正在扫描文件'" },
  },
  required: ["status"],
  additionalProperties: false,
} as never

interface SetStatusArgs {
  status: "thinking" | "working" | "waiting" | "idle"
  hint?: string
}

export function createSetStatusFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "kaiwu_set_status",
      label: "Set Status",
      description: "主动告诉 UI 你当前的状态(thinking/working/waiting/idle),可附提示文案。" + "用于长任务时让用户知道你没卡住。变化时调即可,不用每句话都调。",
      parameters: SetStatusParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
        const params = rawParams as SetStatusArgs
        const event: SetStatusEvent = {
          kind: "set_status",
          sessionKey,
          status: params.status,
          hint: params.hint,
          ts: Date.now(),
        }
        bridge.send({ type: "custom", ts: event.ts, payload: { channel: CHAT_CHANNEL, data: event } })
        return {
          content: [{ type: "text", text: `Status: ${params.status}${params.hint ? ` (${params.hint})` : ""}` }],
          details: { status: params.status, hint: params.hint },
        }
      },
    }
    return tool
  }
}
