import { app } from "electron"
import { createRequire } from "node:module"
import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import type { ProgressInfo, UpdateInfo } from "electron-updater"
import type { CheckResult, UpdateAvailability, UpdaterError, UpdaterEvents } from "./types"

// electron-updater 是 CJS 包，在 ESM 主进程中需要通过 createRequire 加载
const require = createRequire(import.meta.url)
const { autoUpdater } = require("electron-updater")

/**
 * 自动更新模块：检查/下载/安装更新，进度和状态通过事件推送到渲染进程。
 */
@Controller("updater")
export class UpdaterService extends IpcController<UpdaterEvents> implements IpcLifecycle {
  onReady(): void {
    this.bindAutoUpdaterEvents()
  }

  /**
   * 检查是否有可用更新。
   * 仅在打包后生效：dev 环境下直接返回错误对象，避免 electron-updater 因缺少配置抛错。
   */
  @Handle("action:check")
  async check(): Promise<CheckResult> {
    if (!app.isPackaged) {
      const error = new Error("The update feature is only available after the package.")
      return { message: error.message, error }
    }
    try {
      await autoUpdater.checkForUpdatesAndNotify()
      return null
    } catch (error) {
      return {
        message: "Network error",
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  /** 开始下载已检查到的更新，进度通过事件推送。 */
  @Handle("action:download")
  download(): void {
    autoUpdater.downloadUpdate()
  }

  /** 退出应用并安装已下载的更新，调用后进程立即结束。 */
  @Handle("action:install")
  install(): void {
    autoUpdater.quitAndInstall(false, true)
  }

  /**
   * 绑定 autoUpdater 的所有事件到渲染进程推送。
   * 在构造函数中调用，保证事件不重复注册。
   */
  private bindAutoUpdaterEvents(): void {
    // 手动控制下载时机：check 后不自动下载，等用户确认
    autoUpdater.autoDownload = false
    autoUpdater.disableWebInstaller = false
    autoUpdater.allowDowngrade = false

    autoUpdater.on("update-available", (info: UpdateInfo) => {
      this.emit("event:available", {
        update: true,
        version: app.getVersion(),
        newVersion: info?.version,
      } satisfies UpdateAvailability)
    })

    autoUpdater.on("update-not-available", (info: UpdateInfo) => {
      this.emit("event:available", {
        update: false,
        version: app.getVersion(),
        newVersion: info?.version,
      } satisfies UpdateAvailability)
    })

    autoUpdater.on("download-progress", (info: ProgressInfo) => {
      this.emit("event:progress", info)
    })

    autoUpdater.on("update-downloaded", () => {
      this.emit("event:done", undefined)
    })

    autoUpdater.on("error", (error: Error) => {
      const payload: UpdaterError = { message: error.message, error }
      this.emit("event:error", payload)
    })
  }
}
