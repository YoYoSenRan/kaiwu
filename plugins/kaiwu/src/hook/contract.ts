/**
 * hook 能力契约（插件侧）：让 kaiwu 动态订阅任意 OpenClaw hook 事件名并接收事件回推。
 * 对 session / chat 未覆盖的能力做通用 fallback，也便于调试期旁路观察。
 */

export interface HookSubscribeRequest {
  eventName: string
}

export interface HookUnsubscribeRequest {
  eventName: string
}

export interface HookFiredEvent {
  eventName: string
  payload: unknown
  ts: number
}

// TODO: 命令路由与实际订阅注册待能力层实现。
