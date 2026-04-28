/**
 * 聚合所有宿主 runtime hook 订阅 — 对应 `api.on(eventName, handler)`。
 *
 * 新增 hook 步骤:
 *   1. 在本目录新建 `<name>.ts`,导出 create/setup 函数
 *   2. 在下方 setup 流程里加一行 `api.on(...)` 调用
 */

import type { OpenClawPluginApi } from "../../api.js"
import type { BridgeClient } from "../bridge/transport.js"
import { createMonitorSink } from "../bridge/monitor.js"
import { setupMonitorCollector } from "./monitor.js"
import { createPromptHook } from "./prompt.js"

export function setupHooks(api: OpenClawPluginApi, bridge: BridgeClient): void {
  // agent 每轮推理前注入阶段上下文
  api.on("before_prompt_build", createPromptHook())

  // 运行时事件旁路到控制端(LLM I/O / tool call / agent lifecycle)
  setupMonitorCollector(api.on.bind(api), createMonitorSink(bridge))
}
