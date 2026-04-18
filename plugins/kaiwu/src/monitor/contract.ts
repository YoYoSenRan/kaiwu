/**
 * monitor 能力契约（插件侧）。
 *
 * 插件订阅 OpenClaw 的运行时 hook，将事件归一化为 MonitorEvent 后
 * 通过 bridge WS 的 custom 通道转发给 kaiwu 主进程。
 * kaiwu 侧按 hookName 分发到 renderer 订阅者。
 */

/** 通过 bridge WS custom 通道发送时使用的 channel 名。 */
export const MONITOR_CHANNEL = "monitor"

/** 可订阅的 OpenClaw hook 名称。按需扩展。 */
export const MONITOR_HOOKS = ["llm_input", "llm_output", "agent_end", "before_tool_call", "after_tool_call", "message_received", "message_sending", "message_sent"] as const

export type MonitorHookName = (typeof MONITOR_HOOKS)[number]

/** 归一化后的监控事件，统一结构推给 kaiwu 主进程。 */
export interface MonitorEvent {
  /** 触发的 hook 名称 */
  hookName: MonitorHookName
  /** hook 的 event 参数（原样透传） */
  event: unknown
  /** hook 的 ctx 参数子集 */
  ctx: {
    sessionKey?: string
    agentId?: string
    runId?: string
  }
  /** 事件采集时间戳（ms） */
  ts: number
}
