/** log feature 的 IPC 通道常量 */
export const logChannels = {
  /** 渲染进程 → 主进程：写日志 */
  write: "log:write",
} as const

/** 支持的日志级别 */
export type LogLevel = "info" | "warn" | "error" | "debug"
