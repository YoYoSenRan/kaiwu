import { contextBridge } from "electron"
import { logBridge } from "./platform/logger/bridge"
import { themeBridge } from "./platform/theme/bridge"
import { powerBridge } from "./platform/power/bridge"
import { shellBridge } from "./platform/shell/bridge"
import { chromeBridge } from "./platform/chrome/bridge"
import { dialogBridge } from "./platform/dialog/bridge"
import { updaterBridge } from "./platform/updater/bridge"
import { deeplinkBridge } from "./platform/deeplink/bridge"
import { clipboardBridge } from "./platform/clipboard/bridge"
import { notificationBridge } from "./platform/notification/bridge"
import { openclawBridge } from "./features/openclaw/bridge"
import { knowledgeBridge } from "./features/knowledge/bridge"

/** Electron API 类型，供 renderer 端通过 global.d.ts 引用 */
export type ElectronAPI = typeof api

// renderer 需要的具名类型从 preload 统一 re-export，避免 renderer 跨目录直接引用 feature 内部 types
export type { OpenClawStatus, CompatResult, PluginEvent, MonitorEvent, GatewayState, GatewayEventFrame } from "./features/openclaw/types"

/**
 * 渲染进程可访问的全部 API。
 * 按 feature 分域，渲染进程通过 window.electron.xxx 调用。
 */
const api = {
  // platform
  log: logBridge,
  theme: themeBridge,
  power: powerBridge,
  shell: shellBridge,
  chrome: chromeBridge,
  dialog: dialogBridge,
  updater: updaterBridge,
  deeplink: deeplinkBridge,
  clipboard: clipboardBridge,
  notification: notificationBridge,
  // features
  openclaw: openclawBridge,
  knowledge: knowledgeBridge,
} as const

contextBridge.exposeInMainWorld("electron", api)
