/**
 * 聚合所有 agent 工具注册 — 对应宿主的 `api.registerTool()`。
 *
 * 新增工具步骤:
 *   1. 在本目录新建 `<name>.ts`,导出 factory 函数
 *   2. 在下方数组加一行
 *
 * 当前工具(全部用 `kaiwu_` 前缀防冲突):
 *   - kaiwu_hand_off:         路由发言权给其他 agent(仅调度型可调)
 *   - kaiwu_ask_user:         请求用户介入,挂起群聊等待回复
 *   - kaiwu_end_turn:         显式结束本轮,不再输出文字
 *   - kaiwu_show_card:        嵌入按钮卡片供用户点选
 *   - kaiwu_set_status:       主动标记思考/工作/等待状态
 *   - kaiwu_report_progress:  长任务分步进度上报
 */

import type { OpenClawPluginApi } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { createAskUserFactory } from "./ask-user.js"
import { createEndTurnFactory } from "./end-turn.js"
import { createHandOffFactory } from "./hand-off.js"
import { createReportProgressFactory } from "./report-progress.js"
import { createSetStatusFactory } from "./set-status.js"
import { createShowCardFactory } from "./show-card.js"

/**
 * 对齐 openclaw 内置 feishu 插件写法:registerTool 显式传 opts.name。
 * openclaw registry 在 factory 未调用前就能知道工具名,tools.allow/deny 检查更早触发,过滤更可靠。
 */
const ENTRIES: ReadonlyArray<readonly [string, (bridge: BridgeClient) => Parameters<OpenClawPluginApi["registerTool"]>[0]]> = [
  ["kaiwu_hand_off", createHandOffFactory],
  ["kaiwu_ask_user", createAskUserFactory],
  ["kaiwu_end_turn", createEndTurnFactory],
  ["kaiwu_show_card", createShowCardFactory],
  ["kaiwu_set_status", createSetStatusFactory],
  ["kaiwu_report_progress", createReportProgressFactory],
]

export function setupTools(api: OpenClawPluginApi, bridge: BridgeClient): void {
  for (const [name, make] of ENTRIES) {
    api.registerTool(make(bridge), { name })
  }
}
