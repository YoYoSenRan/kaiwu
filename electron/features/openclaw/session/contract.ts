/**
 * session 能力契约（主进程侧）。
 * 镜像 plugins/kaiwu-bridge/src/session/contract.ts，两端字段必须保持一致。
 */

export interface SessionLifecycleEvent {
  sessionKey: string
  reason: string
  parentSessionKey?: string
  label?: string
  displayName?: string
}

// TODO: IPC 命令/事件表面待能力层实现。
