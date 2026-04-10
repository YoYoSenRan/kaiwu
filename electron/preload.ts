import { contextBridge } from "electron"
import { chromeBridge } from "./features/chrome/bridge"
import { deeplinkBridge } from "./features/deeplink/bridge"
import { logBridge } from "./features/log/bridge"
import { openclawBridge } from "./features/openclaw/bridge"
import { updaterBridge } from "./features/updater/bridge"

/** Electron API 类型，供 renderer 端通过 global.d.ts 引用 */
export type ElectronAPI = typeof api

/**
 * 渲染进程可访问的全部 API。
 * 按 feature 分域，渲染进程通过 window.electron.xxx 调用。
 */
const api = {
  log: logBridge,
  chrome: chromeBridge,
  updater: updaterBridge,
  deeplink: deeplinkBridge,
  openclaw: openclawBridge,
} as const

contextBridge.exposeInMainWorld("electron", api)
