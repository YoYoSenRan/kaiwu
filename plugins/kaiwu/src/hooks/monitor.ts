/**
 * 运行时事件采集 hook — 订阅宿主 hook 列表,归一化为 MonitorEvent 后通过 bridge 推给控制端。
 *
 * 每个 hook handler 从 event + ctx 中提取关键字段,不做过滤或聚合 —
 * 原样采集,由控制端侧决定展示逻辑。
 */

import type { MonitorEvent, MonitorHookName } from "../bridge/monitor.js"
import { MONITOR_HOOKS } from "../bridge/monitor.js"

type HookRegisterFn = (event: string, handler: (event: unknown, ctx: unknown) => unknown) => void

type MonitorSink = (event: MonitorEvent) => void

interface AgentContext {
  sessionKey?: string
  agentId?: string
  runId?: string
}

/**
 * 向宿主注册所有监控 hook,采集到的事件推入 sink(由 bridge/monitor 提供)。
 */
export function setupMonitorCollector(on: HookRegisterFn, sink: MonitorSink): void {
  for (const hookName of MONITOR_HOOKS) {
    on(hookName, (event: unknown, ctx: unknown) => {
      sink(normalize(hookName, event, ctx))
    })
  }
}

function normalize(hookName: MonitorHookName, event: unknown, ctx: unknown): MonitorEvent {
  const agentCtx = (ctx ?? {}) as AgentContext
  return {
    hookName,
    event,
    ctx: {
      sessionKey: agentCtx.sessionKey,
      agentId: agentCtx.agentId,
      runId: agentCtx.runId,
    },
    ts: Date.now(),
  }
}
