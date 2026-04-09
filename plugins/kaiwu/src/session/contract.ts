/**
 * session 能力契约（插件侧）。
 * 当前仅镜像 OpenClaw `src/sessions/session-lifecycle-events.ts` 的事件形状。
 * 命令接口（list / get / close）OpenClaw 未公开统一 API，待实际需求明确后补齐。
 */

/** 镜像自 openclaw/src/sessions/session-lifecycle-events.ts 的 SessionLifecycleEvent。 */
export interface SessionLifecycleEvent {
  sessionKey: string
  reason: string
  parentSessionKey?: string
  label?: string
  displayName?: string
}

// TODO: 订阅入口与命令方法待能力层实现。
