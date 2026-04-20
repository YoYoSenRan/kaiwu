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

export function setupTools(api: OpenClawPluginApi, bridge: BridgeClient): void {
  const factories = [
    createHandOffFactory(bridge),
    createAskUserFactory(bridge),
    createEndTurnFactory(bridge),
    createShowCardFactory(bridge),
    createSetStatusFactory(bridge),
    createReportProgressFactory(bridge),
  ]
  for (const factory of factories) api.registerTool(factory)
}
