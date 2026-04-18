import { app, BrowserWindow } from "electron"
import { isWin, isWin7 } from "../infra/env"
import { Phase } from "../framework/lifecycle"
import { reopenMainWindow } from "./window"
import type { AppModule } from "../framework/module"

/**
 * 平台准备：Win7 禁 GPU、Windows 10+ 设 AppUserModelId。
 * 必须在 whenReady 前完成（disableHardwareAcceleration 只能在 ready 前调）。
 */
export const platformPrepModule: AppModule = {
  name: "platform-prep",
  phase: Phase.Starting,
  setup() {
    if (isWin7) app.disableHardwareAcceleration()
    if (isWin) app.setAppUserModelId(app.getName())
  },
}

/**
 * 单实例锁：第二个进程启动时直接退出。
 * 锁失败调 process.exit(0) 立即结束，后续模块不执行。
 */
export const singleInstanceModule: AppModule = {
  name: "single-instance",
  phase: Phase.Starting,
  setup() {
    if (!app.requestSingleInstanceLock()) {
      app.quit()
      process.exit(0)
    }
  },
}

/**
 * 应用级生命周期绑定：activate / window-all-closed。
 */
export const appLifecycleModule: AppModule = {
  name: "app-lifecycle",
  phase: Phase.Starting,
  setup(ctx) {
    app.on("activate", () => {
      // macOS dock 点击：有窗口聚焦第一个，无窗口重建主窗口
      const windows = BrowserWindow.getAllWindows()
      if (windows.length) {
        const win = windows[0]
        if (win.isMinimized()) win.restore()
        win.focus()
      } else {
        reopenMainWindow(ctx)
      }
    })

    app.on("window-all-closed", () => {
      ctx.mainWindow.set(null)
      app.quit()
    })
  },
}
