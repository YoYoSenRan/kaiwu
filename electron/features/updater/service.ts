import { app } from "electron"
import log from "../../core/logger"
import { createRequire } from "node:module"
import { updaterChannels } from "./channels"
import { getMainWindow } from "../../core/window"
import type { ProgressInfo, UpdateInfo } from "electron-updater"
import type { CheckResult, UpdateAvailability, UpdaterError } from "./types"

// electron-updater 是 CJS 包，在 ESM 主进程中需要通过 createRequire 加载
const require = createRequire(import.meta.url)
const { autoUpdater } = require("electron-updater")

let eventsBound = false

/**
 * 绑定 autoUpdater 的所有事件到主窗口推送。
 * 幂等：重复调用只生效一次，避免多次注册同一事件导致重复推送。
 */
export function bindAutoUpdaterEvents(): void {
  if (eventsBound) return
  eventsBound = true

  // 手动控制下载时机：check 后不自动下载，等用户确认
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    pushToRenderer(updaterChannels.canAvailable, {
      update: true,
      version: app.getVersion(),
      newVersion: info?.version,
    } satisfies UpdateAvailability)
  })

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    pushToRenderer(updaterChannels.canAvailable, {
      update: false,
      version: app.getVersion(),
      newVersion: info?.version,
    } satisfies UpdateAvailability)
  })

  autoUpdater.on("download-progress", (info: ProgressInfo) => {
    pushToRenderer(updaterChannels.downloadProgress, info)
  })

  autoUpdater.on("update-downloaded", () => {
    pushToRenderer(updaterChannels.downloaded, undefined)
  })

  autoUpdater.on("error", (error: Error) => {
    const payload: UpdaterError = { message: error.message, error }
    pushToRenderer(updaterChannels.error, payload)
  })
}

/**
 * 检查是否有可用更新。
 * 仅在打包后生效：dev 环境下直接返回错误对象，避免 electron-updater 因缺少配置抛错。
 */
export async function checkForUpdate(): Promise<CheckResult> {
  if (!app.isPackaged) {
    const error = new Error("The update feature is only available after the package.")
    return { message: error.message, error }
  }

  try {
    await autoUpdater.checkForUpdatesAndNotify()
    // 结果通过事件推送（update-available / update-not-available），此处不返回
    return null
  } catch (error) {
    return { message: "Network error", error: error as Error }
  }
}

/** 开始下载已检查到的更新，进度通过事件推送。 */
export function startDownload(): void {
  autoUpdater.downloadUpdate()
}

/** 退出应用并安装已下载的更新，调用后进程立即结束。 */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true)
}

/**
 * 统一的事件推送：找到当前主窗口并发送到渲染进程。
 * 窗口不存在时静默丢弃（用户可能已关闭窗口）。
 */
function pushToRenderer(channel: string, payload: unknown): void {
  const win = getMainWindow()
  if (!win) {
    log.warn(`[updater] 无主窗口，丢弃事件 ${channel}`)
    return
  }
  win.webContents.send(channel, payload)
}
