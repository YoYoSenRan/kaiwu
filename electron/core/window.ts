import log from "./logger"
import store from "./store"
import path from "node:path"
import { isMac } from "./env"
import { BrowserWindow, shell } from "electron"
import { INDEX_HTML, PRELOAD_PATH, VITE_DEV_SERVER_URL, VITE_PUBLIC } from "./paths"

// 模块级单例：全项目共享同一个主窗口引用
let mainWindow: BrowserWindow | null = null

// 窗口最小尺寸：防止标题栏按钮被挤压
const MIN_WIDTH = 400
const MIN_HEIGHT = 300

/**
 * 创建主窗口并持有为模块级单例。
 * 如果已经存在则直接返回，避免重复创建。
 */
export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  const { x, y, width, height } = store.get("windowBounds")

  // macOS: 隐藏标题栏但保留系统红绿灯（hiddenInset）
  // Win/Linux: 完全无边框，由渲染进程绘制自定义按钮（frame: false）
  const platformConfig = isMac ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 12, y: 12 } } : { frame: false }

  mainWindow = new BrowserWindow({
    title: "Main window",
    icon: path.join(VITE_PUBLIC, "favicon.ico"),
    x,
    y,
    width,
    height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    ...platformConfig,
    webPreferences: {
      preload: PRELOAD_PATH,
    },
  })

  bindWindowEvents(mainWindow)
  loadContent(mainWindow)

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

/**
 * 绑定窗口的核心事件（与具体 feature 无关）：
 * - resized/moved: 持久化窗口尺寸
 * - setWindowOpenHandler: 外链用系统浏览器打开
 *
 * 注意：chrome feature 特有的 maximize/unmaximize 事件推送
 * 由 features/chrome 自己绑定，core 不引用任何 feature 通道常量。
 */
function bindWindowEvents(win: BrowserWindow): void {
  const saveBounds = () => {
    // 最小化/最大化时的尺寸不代表用户真实偏好，跳过保存
    if (!win.isMinimized() && !win.isMaximized()) {
      store.set("windowBounds", win.getBounds())
    }
  }
  win.on("resized", saveBounds)
  win.on("moved", saveBounds)

  // 所有外链用系统浏览器打开，避免应用内加载不受控内容
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url)
    return { action: "deny" }
  })
}

/** 加载渲染进程内容：dev 走 Vite 服务器，prod 走本地 HTML。 */
function loadContent(win: BrowserWindow): void {
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(INDEX_HTML)
  }

  win.webContents.on("did-finish-load", () => {
    log.info("[window] 主窗口加载完成")
  })
}
