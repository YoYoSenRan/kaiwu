import path from "node:path"
import store from "../infra/store"
import { isDev, isMac } from "../infra/env"
import { indexHtml, preloadPath, publicPath, viteDevServerUrl } from "../infra/paths"
import { Phase } from "../framework/lifecycle"
import { app, BrowserWindow, BrowserWindowConstructorOptions, shell } from "electron"
import type { AppContext } from "./context"
import type { AppModule } from "../framework/module"

/**
 * 主窗口模块：whenReady 后创建主窗口、加载首页、绑定窗口事件。
 * 创建完毕把窗口塞进 ctx.mainWindow，后续模块通过它访问。
 */
export const mainWindowModule: AppModule = {
  name: "main-window",
  phase: Phase.Ready,
  setup(ctx) {
    const win = buildMainWindow(ctx)
    void loadMainPage(win)
  },
}

/** 供 activate 事件重建主窗口使用。 */
export function reopenMainWindow(ctx: AppContext): void {
  if (ctx.mainWindow.get()) return
  const win = buildMainWindow(ctx)
  void loadMainPage(win)
}

function buildMainWindow(ctx: AppContext): BrowserWindow {
  const win = new BrowserWindow(resolveWindowOptions())
  ctx.mainWindow.set(win)
  bindWindowEvents(ctx, win)
  win.once("ready-to-show", () => win.show())
  return win
}

function resolveWindowOptions(): BrowserWindowConstructorOptions {
  const { x, y, width, height } = store.get("windowBounds")

  const options: BrowserWindowConstructorOptions = {
    x,
    y,
    show: false,
    title: app.getName(),
    width,
    height,
    minWidth: 400,
    minHeight: 300,
    icon: path.join(publicPath, "favicon.ico"),
    webPreferences: { preload: preloadPath },
  }

  if (isMac) {
    options.titleBarStyle = "hiddenInset"
    options.trafficLightPosition = { x: 12, y: 12 }
  } else {
    options.frame = false
  }

  return options
}

function bindWindowEvents(ctx: AppContext, win: BrowserWindow): void {
  win.on("moved", () => saveWindowBounds(win))
  win.on("resized", () => saveWindowBounds(win))
  win.on("closed", () => ctx.mainWindow.set(null))

  // 所有外链用系统浏览器打开，避免应用内加载不受控内容
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url)
    return { action: "deny" }
  })
}

/** 最小化/最大化尺寸不代表用户真实偏好，跳过保存。 */
function saveWindowBounds(win: BrowserWindow): void {
  if (win.isMinimized() || win.isMaximized()) return
  store.set("windowBounds", win.getBounds())
}

function loadMainPage(win: BrowserWindow): Promise<void> {
  return isDev ? win.loadURL(viteDevServerUrl!) : win.loadFile(indexHtml)
}
