/**
 * Monitor 事件 relay — 宿主运行时 hook 采集到的事件通过 bridge 推给控制端。
 *
 * 走 bridge WS 的 `custom` channel(MONITOR_CHANNEL = "monitor"),
 * data 为 MonitorEvent。控制端侧按 hookName 分发到订阅者。
 */

import type { BridgeClient } from "./transport.js"
import { makeEvent } from "./envelope.js"

export const MONITOR_CHANNEL = "monitor"

/** 可订阅的宿主 hook 名称。按需扩展。 */
export const MONITOR_HOOKS = [
  "llm_input",
  "llm_output",
  "agent_end",
  "before_tool_call",
  "after_tool_call",
  "message_received",
  "message_sending",
  "message_sent",
] as const

export type MonitorHookName = (typeof MONITOR_HOOKS)[number]

/** 归一化后的监控事件。 */
export interface MonitorEvent {
  hookName: MonitorHookName
  /** hook 原始 event 参数(透传)。 */
  event: unknown
  /** hook ctx 关键字段子集。 */
  ctx: {
    sessionKey?: string
    agentId?: string
    runId?: string
  }
  /** 采集时间戳(ms)。 */
  ts: number
}

/**
 * 创建 monitor sink — hooks/monitor 的 collector 调用此函数推事件到控制端。
 */
export function createMonitorSink(client: BridgeClient): (event: MonitorEvent) => void {
  return (event) => {
    client.send(makeEvent("custom", { channel: MONITOR_CHANNEL, data: event }))
  }
}
