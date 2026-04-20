/**
 * `kaiwu_report_progress` agent 工具 — 长任务分步进度上报。
 *
 * 用途:
 *   agent 执行多步任务(如"扫 10 个文件"、"分析 5 个竞品")时定期调此工具,
 *   UI 可渲染进度条或步骤列表,用户能看到任务推进而非空等。
 *
 * 和 kaiwu_set_status 的关系:
 *   set_status       → 状态(thinking/working/waiting),定性
 *   report_progress  → 步骤 + 数量,定量
 *   通常组合使用:开始时 set_status("working"),中间多次 report_progress,
 *   结束前 set_status("idle")。
 *
 * current / total 约定:
 *   - 都传:显示百分比 + "3/10"
 *   - 只传 current:显示"step 3"(无进度条)
 *   - total 可变:agent 发现还有更多步骤时可在后续调用里增大 total
 *
 * 什么时候 NOT 调:
 *   - 单步任务或快速响应(< 5 秒)
 *   - 已经通过文字在 stream 吐"第 3 步:分析..."这类内容(重复)
 */

import { Type, type Static } from "@sinclair/typebox"
import type { AnyAgentTool, OpenClawPluginToolContext, OpenClawPluginToolFactory } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { CHAT_CHANNEL, type ReportProgressEvent } from "../bridge/chat.js"

const ReportProgressParams = Type.Object({
  step: Type.String({ description: "当前步骤的简短描述,如 '分析发现 3' 或 '下载文件 README.md'" }),
  current: Type.Number({ description: "当前步骤序号(1-based 或从 0 开始都行,但需一致)" }),
  total: Type.Optional(Type.Number({ description: "总步骤数(已知时传,UI 可显进度条)" })),
})

export function createReportProgressFactory(bridge: BridgeClient): OpenClawPluginToolFactory {
  return (ctx: OpenClawPluginToolContext) => {
    const sessionKey = ctx.sessionKey ?? ""
    const tool: AnyAgentTool = {
      name: "kaiwu_report_progress",
      label: "Report Progress",
      description: "长任务分步进度上报。调用后 UI 显当前步骤 + 可选进度条。" + "适用多步任务(扫文件 / 批处理)让用户看到推进。短任务不用调。",
      parameters: ReportProgressParams,
      execute: async (_toolCallId: string, rawParams: unknown) => {
        const params = rawParams as Static<typeof ReportProgressParams>
        const event: ReportProgressEvent = {
          kind: "report_progress",
          sessionKey,
          step: params.step,
          current: params.current,
          total: params.total,
          ts: Date.now(),
        }
        bridge.send({ type: "custom", ts: event.ts, payload: { channel: CHAT_CHANNEL, data: event } })
        const fraction = params.total ? ` ${params.current}/${params.total}` : ` step ${params.current}`
        return {
          content: [{ type: "text", text: `Progress:${fraction} — ${params.step}` }],
          details: { step: params.step, current: params.current, total: params.total },
        }
      },
    }
    return tool
  }
}
