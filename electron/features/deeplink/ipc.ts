import { app } from "electron"
import { getMainWindow } from "../../core/window"
import { extractDeepLinkFromArgv, handleDeepLink } from "./service"

/**
 * 注册深度链接相关的应用级事件监听。
 * 没有 ipcMain.handle，只有 app 事件 —— 因为深度链接是 OS → 应用的方向。
 * 必须在 app.whenReady() 之前调用，因为 macOS 冷启动的 open-url 会在 ready 之前触发。
 */
export function setupDeeplinkListeners(): void {
  // macOS: 点击深度链接或应用被协议冷启动时触发
  app.on("open-url", (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  // Windows/Linux: 协议 URL 作为命令行参数传给第二个实例
  app.on("second-instance", (_event, argv) => {
    const win = getMainWindow()
    if (!win) return

    const url = extractDeepLinkFromArgv(argv)
    if (url) {
      handleDeepLink(url)
    } else {
      // 非深度链接触发的第二实例，仅聚焦主窗口
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}
