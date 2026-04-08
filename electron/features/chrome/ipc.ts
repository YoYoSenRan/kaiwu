import { chromeChannels } from "./channels"
import { ipcMain, BrowserWindow } from "electron"
import { getMainWindow } from "../../core/window"
import { INDEX_HTML, PRELOAD_PATH, VITE_DEV_SERVER_URL } from "../../core/paths"

/**
 * 注册 chrome feature 的所有 IPC handler 和主窗口事件。
 * 必须在 app.whenReady() 之后 **且主窗口已创建** 之后调用。
 */
export function setupChrome(): void {
  registerHandlers()
  bindMaximizeEvents()
}

/** 注册所有 ipcMain.handle，与窗口实例无关。 */
function registerHandlers(): void {
  ipcMain.handle(chromeChannels.minimize, () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle(chromeChannels.maximize, () => {
    const win = getMainWindow()
    if (!win) return
    // 切换最大化/还原
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle(chromeChannels.close, () => {
    getMainWindow()?.close()
  })

  ipcMain.handle(chromeChannels.isMaximized, () => {
    return getMainWindow()?.isMaximized() ?? false
  })

  ipcMain.handle(chromeChannels.openWin, (_event, targetPath: string) => {
    openChildWindow(targetPath)
  })
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
    win.webContents.send(chromeChannels.maximizedChanged, true)
  })
  win.on("unmaximize", () => {
    win.webContents.send(chromeChannels.maximizedChanged, false)
  })
}

/**
 * 打开子窗口并加载指定路径。
 * @param targetPath 子窗口要加载的路由路径
 */
function openChildWindow(targetPath: string): void {
  const child = new BrowserWindow({
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    child.loadURL(`${VITE_DEV_SERVER_URL}#${targetPath}`)
  } else {
    child.loadFile(INDEX_HTML, { hash: targetPath })
  }
}
