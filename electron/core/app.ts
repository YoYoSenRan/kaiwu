import { isWin, isWin7 } from "./env"
import { app, BrowserWindow } from "electron"
import { createMainWindow, clearMainWindow } from "./window"

/**
 * 应用启动前的同步准备工作。
 * 必须在 app.whenReady() 之前调用，包括单实例锁和平台特殊配置。
 */
export function prepareApp(): void {
  // Win7 GPU 加速常导致崩溃，直接禁用
  if (isWin7) app.disableHardwareAcceleration()

  // Windows 10+ 通知需要 AppUserModelId 才能显示应用名
  if (isWin) app.setAppUserModelId(app.getName())
}

/**
 * 申请单实例锁，返回是否获取成功。
 * 未获取到锁时应立即退出应用，避免第二个实例启动。
 */
export function requestSingleInstance(): boolean {
  return app.requestSingleInstanceLock()
}

/**
 * 注册应用级生命周期事件：窗口全部关闭和 macOS dock 激活。
 */
export function setupAppLifecycle(): void {
  app.on("window-all-closed", () => {
    clearMainWindow()
    // 所有平台统一行为：关闭窗口即退出应用
    app.quit()
  })

  app.on("activate", () => {
    // macOS dock 图标点击：有窗口则聚焦第一个，无窗口则新建
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].focus()
    } else {
      createMainWindow()
    }
  })
}
