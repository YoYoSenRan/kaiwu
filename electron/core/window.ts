import path from "node:path"
import store from "./store"
import { isDev, isMac } from "./env"
import { indexHtml, preloadPath, publicPath, viteDevServerUrl } from "./paths"
import { BrowserWindow, BrowserWindowConstructorOptions, shell } from "electron"

// 模块级单例：全项目共享同一个主窗口引用
let mainWindow: BrowserWindow | null = null

/**
 * 创建主窗口并持有为模块级单例。
 * 如果已经存在则直接返回，避免重复创建。
 */
export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  mainWindow = new BrowserWindow(resolveWindowOptions())
  loadMainPage(mainWindow)
  bindWindowEvents(mainWindow)

  return mainWindow
}

/** 获取当前主窗口实例，不存在时返回 null。 */
export function getMainWindow(): BrowserWindow | null {
  if (!mainWindow || mainWindow.isDestroyed()) return null
  return mainWindow
}

/** 清除主窗口引用，供 window-all-closed 调用。 */
export function clearMainWindow(): void {
  mainWindow = null
}

/** 组装 BrowserWindow 配置。 */
function resolveWindowOptions(): BrowserWindowConstructorOptions {
  const { x, y, width, height } = store.get("windowBounds")

  const options: BrowserWindowConstructorOptions = {
    x,
    y,
    title: "Main window",
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

/**
 * 绑定窗口的核心事件（与具体 feature 无关）：
 * - resized/moved: 持久化窗口尺寸
 * - setWindowOpenHandler: 外链用系统浏览器打开
 *
 * 注意：chrome feature 特有的 maximize/unmaximize 事件推送
 * 由 features/chrome 自己绑定，core 不引用任何 feature 通道常量。
 */
function bindWindowEvents(win: BrowserWindow): void {
  win.on("moved", () => saveWindowBounds(win))
  win.on("resized", () => saveWindowBounds(win))

  // 所有外链用系统浏览器打开，避免应用内加载不受控内容
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url)
    return { action: "deny" }
  })
}

/** 保存窗口尺寸。最小化/最大化时的尺寸不代表用户真实偏好，跳过保存。 */
function saveWindowBounds(win: BrowserWindow): void {
  if (win.isMinimized() || win.isMaximized()) return
  store.set("windowBounds", win.getBounds())
}

/** 加载主页面：dev 模式走 Vite 服务器，prod 模式走本地 HTML。 */
function loadMainPage(win: BrowserWindow): Promise<void> {
  return isDev ? win.loadURL(viteDevServerUrl!) : win.loadFile(indexHtml)
}
