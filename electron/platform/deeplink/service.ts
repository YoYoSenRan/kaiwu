import path from "node:path"
import { app } from "electron"
import { scope } from "../../infra/logger"
import { Phase } from "../../framework/lifecycle"
import type { AppContext } from "../../app/context"
import type { AppModule } from "../../framework/module"
import type { DeepLinkPayload } from "./types"

const deeplinkLog = scope("deeplink")

/** 自定义协议名，用于唤起应用：electron-vite-react://some/path?k=v */
export const PROTOCOL = "electron-vite-react"

/** deeplink 推送通道，固定字符串，bridge.ts 同步使用 */
const RECEIVED_CHANNEL = "deeplink:event:received"

// 冷启动时窗口尚未创建，暂存 URL 等待 flush
let pendingUrl: string | null = null

/**
 * Deeplink 启动模块：whenReady 前注册自定义协议 + 绑定 OS 事件监听。
 * 必须在 whenReady 前 —— macOS 冷启动的 open-url 会在 ready 之前触发。
 */
export const deeplinkSetupModule: AppModule = {
  name: "deeplink-setup",
  phase: Phase.Starting,
  setup(ctx) {
    registerProtocol()
    bindDeeplinkListeners(ctx)
  },
}

/**
 * Deeplink 冷启动 flush：主窗口创建后处理暂存 URL。
 */
export const deeplinkFlushModule: AppModule = {
  name: "deeplink-flush",
  phase: Phase.AfterWindowOpen,
  setup(ctx) {
    if (!pendingUrl) return
    const win = ctx.mainWindow.get()
    if (!win) return
    sendPayload(win, pendingUrl)
    pendingUrl = null
  },
}

function registerProtocol(): void {
  if (!app.isPackaged) {
    // 开发环境必须显式指定可执行文件和启动参数，否则指向不存在的打包路径
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

function bindDeeplinkListeners(ctx: AppContext): void {
  // macOS: 点击深度链接或协议冷启动时触发
  app.on("open-url", (event, url) => {
    event.preventDefault()
    handleDeepLink(ctx, url)
  })

  // Windows/Linux: 协议 URL 作为命令行参数传给第二个实例
  app.on("second-instance", (_event, argv) => {
    const win = ctx.mainWindow.get()
    if (!win) return

    const url = extractDeepLinkFromArgv(argv)
    if (url) {
      handleDeepLink(ctx, url)
    } else {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

/** 解析 URL 后推送给渲染进程，窗口未创建时暂存到 pendingUrl 等 flush 模块处理。 */
function handleDeepLink(ctx: AppContext, url: string): void {
  deeplinkLog.info("收到链接", url)

  const win = ctx.mainWindow.get()
  if (!win) {
    pendingUrl = url
    return
  }

  sendPayload(win, url)
  focusWindow(win)
}

/** 从 second-instance 事件的 argv 中提取深度链接 URL。 */
function extractDeepLinkFromArgv(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
}

function sendPayload(win: Electron.BrowserWindow, url: string): void {
  try {
    const parsed = new URL(url)
    const payload: DeepLinkPayload = {
      // host 是协议后第一段（协议://host/pathname），合并为完整路径
      path: parsed.host + parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
    }
    win.webContents.send(RECEIVED_CHANNEL, payload)
  } catch (err) {
    deeplinkLog.error("URL 解析失败", err)
  }
}

function focusWindow(win: Electron.BrowserWindow): void {
  if (win.isMinimized()) win.restore()
  win.focus()
}
