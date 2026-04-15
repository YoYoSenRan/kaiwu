import log, { scope } from "../../infra/logger"
import { Controller, IpcController, On } from "../../framework"

/** 允许渲染进程写入的日志级别白名单，防止 API 误用 */
const ALLOWED = new Set(["info", "warn", "error", "debug"])

type LogLevel = "info" | "warn" | "error" | "debug"

/** 缓存已创建的 scoped logger，避免重复创建 */
const scopeCache = new Map<string, ReturnType<typeof scope>>()

/** 按 scope name 获取或创建 scoped logger。 */
function getScoped(name: string): ReturnType<typeof scope> {
  let logger = scopeCache.get(name)
  if (!logger) {
    logger = scope(name)
    scopeCache.set(name, logger)
  }
  return logger
}

/**
 * 日志桥接模块：渲染进程无法直接写文件，通过 ipcRenderer.send 单向通知主进程写入 electron-log。
 */
@Controller("log")
export class LogService extends IpcController {
  /** 无 scope 的日志写入（向后兼容）。 */
  @On("output:write")
  write(level: LogLevel, ...args: unknown[]): void {
    if (!ALLOWED.has(level)) return
    log[level](...args)
  }

  /** 带 scope 的日志写入，渲染端通过 log.scope("xxx").info(...) 触发。 */
  @On("output:scoped")
  writeScoped(name: string, level: LogLevel, ...args: unknown[]): void {
    if (!ALLOWED.has(level)) return
    getScoped(name)[level](...args)
  }
}
