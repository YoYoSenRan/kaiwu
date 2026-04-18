/**
 * 订阅 OpenClaw 运行时 hook，归一化为 MonitorEvent。
 *
 * 每个 hook handler 从 event + ctx 中提取关键字段，
 * 不做过滤或聚合——原样采集，由 kaiwu 主进程侧决定展示逻辑。
 */

import type { MonitorEvent, MonitorHookName } from "./contract.js"

import { MONITOR_HOOKS } from "./contract.js"

type HookRegisterFn = (event: string, handler: (event: unknown, ctx: unknown) => unknown) => void

type MonitorSink = (event: MonitorEvent) => void

interface AgentContext {
  sessionKey?: string
  agentId?: string
  runId?: string
}

/**
 * 向 OpenClaw 注册所有监控 hook，采集到的事件推入 sink。
 * @param on api.on 方法引用
 * @param sink 接收归一化事件的回调，由 relay 提供
 */
export function setupCollector(on: HookRegisterFn, sink: MonitorSink): void {
  for (const hookName of MONITOR_HOOKS) {
    on(hookName, (event: unknown, ctx: unknown) => {
      sink(normalize(hookName, event, ctx))
    })
  }
}

/** 从 hook 参数提取关键上下文字段，构造统一的 MonitorEvent。 */
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
