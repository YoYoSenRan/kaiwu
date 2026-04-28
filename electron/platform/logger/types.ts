/** 带 scope 的日志方法集 */
export interface ScopedLog {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

export interface LogBridge extends ScopedLog {
  /** 创建带模块标识的 logger，日志中自动标注 scope 名。 */
  scope: (name: string) => ScopedLog
}
