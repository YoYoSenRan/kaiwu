import { contextBridge } from "electron"
import { log } from "./platform/logger/bridge"
import { theme } from "./platform/theme/bridge"
import { power } from "./platform/power/bridge"
import { shell } from "./platform/shell/bridge"
import { chrome } from "./platform/chrome/bridge"
import { dialog } from "./platform/dialog/bridge"
import { updater } from "./platform/updater/bridge"
import { deeplink } from "./platform/deeplink/bridge"
import { clipboard } from "./platform/clipboard/bridge"
import { notification } from "./platform/notification/bridge"
import { openclaw } from "./features/openclaw/bridge"
import { knowledge } from "./features/knowledge/bridge"

/** Electron API 类型，供 renderer 端通过 global.d.ts 引用 */
export type ElectronAPI = typeof api

// renderer 需要的具名类型从 preload 统一 re-export，避免 renderer 跨目录直接引用 feature 内部 types
export type { OpenClawStatus, CompatResult, PluginEvent, MonitorEvent, GatewayState, GatewayEventFrame } from "./features/openclaw/types"

/**
 * 渲染进程可访问的全部 API。
 * 按 feature 分域，渲染进程通过 window.electron.xxx 调用。
 */
const api = {
  log,
  theme,
  power,
  shell,
  chrome,
  dialog,
  updater,
  deeplink,
  clipboard,
  notification,
  openclaw,
  knowledge,
} as const

contextBridge.exposeInMainWorld("electron", api)
