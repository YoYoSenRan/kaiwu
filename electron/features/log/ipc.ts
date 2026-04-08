import { ipcMain } from "electron"
import log from "../../core/logger"
import { logChannels, type LogLevel } from "./channels"

// 允许渲染进程调用的日志级别白名单，防止 API 误用
const ALLOWED_LEVELS: readonly LogLevel[] = ["info", "warn", "error", "debug"]

/**
 * 注册 log feature 的 IPC handler。
 * 渲染进程无法直接写文件，通过 ipcRenderer.send 桥接到主进程的 electron-log。
 */
export function setupLog(): void {
  ipcMain.on(logChannels.write, (_event, level: LogLevel, ...args: unknown[]) => {
    if (!ALLOWED_LEVELS.includes(level)) return
    log[level](...args)
  })
}
