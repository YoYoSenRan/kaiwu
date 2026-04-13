import { BrowserWindow, ipcMain } from "electron"
import { chromeChannels } from "./channels"
import { closeWindow, isMaximized, minimizeWindow, toggleMaximize } from "./service"
import { getMainWindow } from "../../core/window"
import { indexHtml, preloadPath, viteDevServerUrl } from "../../core/paths"

/**
 * 注册 chrome feature 的所有 IPC handler 和主窗口事件。
 * 必须在 app.whenReady() 之后 **且主窗口已创建** 之后调用。
 */
export function setupChrome(): void {
  registerHandlers()
  bindMaximizeEvents()
}

/** 注册所有 ipcMain.handle。 */
function registerHandlers(): void {
  ipcMain.handle(chromeChannels.window.minimize, () => minimizeWindow())
  ipcMain.handle(chromeChannels.window.maximize, () => toggleMaximize())
  ipcMain.handle(chromeChannels.window.close, () => closeWindow())
  ipcMain.handle(chromeChannels.window.state, () => isMaximized())
  ipcMain.handle(chromeChannels.open, (_event, targetPath: string) => openChildWindow(targetPath))
}

/**
 * 绑定主窗口的 maximize/unmaximize 事件，推送给渲染进程用于切换按钮图标。
 * 调用时主窗口必须已存在。
 */
function bindMaximizeEvents(): void {
  const win = getMainWindow()
  if (!win) {
    throw new Error("[chrome] bindMaximizeEvents 必须在主窗口创建之后调用")
  }

  win.on("maximize", () => {
    win.webContents.send(chromeChannels.window.change, true)
  })
  win.on("unmaximize", () => {
    win.webContents.send(chromeChannels.window.change, false)
  })
}

/**
 * 打开子窗口并加载指定路径。
 * 直接使用 BrowserWindow —— 子窗口创建不属于可复用业务逻辑，保留在 IPC 层。
 * @param targetPath 子窗口要加载的路由路径
 */
function openChildWindow(targetPath: string): void {
  const child = new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (viteDevServerUrl) {
    child.loadURL(`${viteDevServerUrl}#${targetPath}`)
  } else {
    child.loadFile(indexHtml, { hash: targetPath })
  }
}
