import { contextBridge } from "electron"
import { logBridge } from "./log/bridge"
import { chromeBridge } from "./chrome/bridge"
import { updaterBridge } from "./updater/bridge"
import { deeplinkBridge } from "./deeplink/bridge"
import { openclawBridge } from "./openclaw/bridge"
import { knowledgeBridge } from "./knowledge/bridge"

/** Electron API 类型，供 renderer 端通过 global.d.ts 引用 */
export type ElectronAPI = typeof api

// renderer 需要的具名类型从 preload 统一 re-export，避免 renderer 跨目录直接引用 feature 内部 types
export type { OpenClawStatus, CompatResult, PluginEvent, MonitorEvent, GatewayState, GatewayEventFrame } from "./openclaw/types"

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
  knowledge: knowledgeBridge,
} as const

contextBridge.exposeInMainWorld("electron", api)
