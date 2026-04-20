/**
 * 聚合所有 agent 工具注册 — 对应宿主的 `api.registerTool()`。
 *
 * 新增工具步骤:
 *   1. 在本目录新建 `<name>.ts`,导出 factory 函数
 *   2. 在下方数组加一行
 */

import type { OpenClawPluginApi } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { createAskUserFactory } from "./ask-user.js"
import { createMentionNextFactory } from "./mention-next.js"

export function setupTools(api: OpenClawPluginApi, bridge: BridgeClient): void {
  const factories = [createMentionNextFactory(bridge), createAskUserFactory(bridge)]
  for (const factory of factories) api.registerTool(factory)
}
