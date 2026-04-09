/**
 * hook 能力契约（主进程侧）。镜像 plugins/kaiwu-bridge/src/hook/contract.ts。
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

// TODO: IPC 命令/事件表面待能力层实现。
