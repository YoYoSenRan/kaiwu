import path from "node:path"
import { app, Menu, Tray, nativeImage } from "electron"
import { Phase } from "../framework/lifecycle"
import type { AppContext } from "../app/context"
import type { AppModule } from "../framework/module"

/**
 * 系统托盘模块。纯 OS 副作用，没有 IPC handler。
 *
 * 构造托盘图标 + 右键菜单 + 左键切换窗口显示。
 * dispose 时销毁 Tray 实例释放资源。
 */
export const trayModule: AppModule = {
  name: "tray",
  phase: Phase.Ready,
  setup(ctx) {
    const iconPath = app.isPackaged ? path.join(process.resourcesPath, "icon.png") : path.join(app.getAppPath(), "resources", "icon.png")
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    const tray = new Tray(icon)

    tray.setToolTip(app.getName())
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "显示主窗口",
          click: () => showMainWindow(ctx),
        },
        { type: "separator" },
        { label: "退出", click: () => app.quit() },
      ]),
    )

    tray.on("click", () => toggleMainWindow(ctx))

    trayRef = tray
  },
  dispose() {
    trayRef?.destroy()
    trayRef = null
  },
}

// 模块级引用仅供 dispose 释放。外部不应访问。
let trayRef: Tray | null = null

function showMainWindow(ctx: AppContext): void {
  const win = ctx.mainWindow.get()
  if (!win) return
  win.show()
  win.focus()
}

function toggleMainWindow(ctx: AppContext): void {
  const win = ctx.mainWindow.get()
  if (!win) return
  if (win.isVisible()) win.hide()
  else win.show()
}
