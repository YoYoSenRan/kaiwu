import path from "node:path"
import log from "../../core/logger"
import { app, BrowserWindow } from "electron"
import type { DeepLinkPayload } from "./types"
import { getMainWindow } from "../../core/window"
import { PROTOCOL, deeplinkChannels } from "./channels"

// 冷启动时窗口尚未创建，暂存 URL 等待 flush
let pendingUrl: string | null = null

/**
 * 注册自定义协议为默认处理程序。
 * 必须在 app.whenReady() 之前调用。
 */
export function setupProtocol(): void {
  if (!app.isPackaged) {
    // 开发环境必须显式指定可执行文件和启动参数，否则会指向不存在的打包路径
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

/**
 * 处理深度链接 URL：解析后推送给渲染进程，并聚焦窗口。
 * 窗口不存在时暂存 URL，等 flushPending 时再处理。
 * @param url 完整的协议 URL，例如 electron-vite-react://foo?bar=1
 */
export function handleDeepLink(url: string): void {
  log.info("[deeplink] 收到链接", url)

  const win = getMainWindow()
  if (!win) {
    // 窗口尚未创建（macOS 冷启动场景），暂存待 flush
    pendingUrl = url
    return
  }

  sendPayload(win, url)
  focusWindow(win)
}

/**
 * 处理应用启动时暂存的深度链接 URL。
 * 应在主窗口创建完成后调用。
 */
export function flushPendingDeepLink(): void {
  if (!pendingUrl) return

  const win = getMainWindow()
  if (!win) return

  sendPayload(win, pendingUrl)
  pendingUrl = null
}

/**
 * 从 second-instance 事件的 argv 中提取深度链接 URL。
 * Windows/Linux 下协议 URL 作为命令行参数传入第二个实例。
 */
export function extractDeepLinkFromArgv(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
}

/** 解析 URL 并推送到渲染进程，解析失败时仅记录日志。 */
function sendPayload(win: BrowserWindow, url: string): void {
  try {
    const parsed = new URL(url)
    const payload: DeepLinkPayload = {
      // host 是协议后的第一段（协议://host/pathname），合并为完整路径
      path: parsed.host + parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
    }
    win.webContents.send(deeplinkChannels.received, payload)
  } catch (err) {
    log.error("[deeplink] URL 解析失败", err)
  }
}

/** 聚焦窗口，如果最小化则先还原。 */
function focusWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore()
  win.focus()
}
