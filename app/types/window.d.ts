// 渲染进程的全局 window 类型扩展
// preload.ts 通过 contextBridge 把 api 挂在 window.electron 上，
// 类型从 preload 的 ElectronAPI 类型推导，保证桥接两端类型一致
import type { ElectronAPI } from "../../electron/preload"

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
