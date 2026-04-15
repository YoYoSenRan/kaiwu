import { ipcRenderer } from "electron"

/**
 * 为 preload 模块创建 namespace-bound IPC 辅助函数集。
 * 所有通道名自动拼接 `${namespace}:` 前缀，与主进程 @Controller 的 prefix 保持一致。
 *
 * 此文件必须独立于 framework/ipc —— 后者导入了 ipcMain / logger 等主进程 API，
 * 如果合并，preload bundle 会拉入主进程依赖导致沙箱崩溃。
 *
 * 泛型 `Events` 声明该 namespace 可订阅的事件映射表（channel → payload 类型），
 * 让 `on(channel, listener)` 的 channel 拼写和 payload 类型在编译期可检。
 *
 * @param namespace 模块命名空间，如 "chrome"
 */
export function createBridge<Events extends object = Record<string, never>>(namespace: string) {
  const ch = (channel: string) => `${namespace}:${channel}`
  return {
    /** 调用主进程 @Handle 方法，返回 Promise */
    invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
      return ipcRenderer.invoke(ch(channel), ...args) as Promise<T>
    },
    /** 向主进程 @On 方法发送单向消息（fire-and-forget） */
    send(channel: string, ...args: unknown[]): void {
      ipcRenderer.send(ch(channel), ...args)
    },
    /** 订阅主进程推送事件，返回取消订阅函数。channel 必须是 Events 声明的 key。 */
    on<K extends keyof Events & string>(channel: K, listener: (payload: Events[K]) => void): () => void {
      const full = ch(channel)
      const handler = (_e: unknown, payload: unknown) => listener(payload as Events[K])
      ipcRenderer.on(full, handler)
      return () => ipcRenderer.off(full, handler)
    },
  }
}
