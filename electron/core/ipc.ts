import { ipcMain } from "electron"
import { scope } from "./logger"

const ipcLog = scope("ipc")

/**
 * 包装 ipcMain.handle，统一捕获异常并在主进程记录完整堆栈。
 * 跨进程序列化会丢失 Error 的 stack 属性，这里确保 main 侧日志完整。
 * @param channel IPC 通道名
 * @param fn 实际的 handler 实现
 */
export function safeHandle(channel: string, fn: (...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      ipcLog.error(`${channel}:`, err)
      throw err
    }
  })
}
