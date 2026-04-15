import { BrowserWindow } from "electron"
import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import { indexHtml, preloadPath, viteDevServerUrl } from "../../infra/paths"
import type { ChromeEvents } from "./types"

/**
 * 窗口外壳模块：标题栏控制、最大化/最小化/关闭、子窗口打开。
 * 必须在 createMainWindow() 之后实例化（通过 ipcModule.phase = AfterWindowOpen 保证）。
 */
@Controller("chrome")
export class ChromeService extends IpcController<ChromeEvents> implements IpcLifecycle {
  onReady(): void {
    const win = this.ctx.mainWindow.get()
    if (win) {
      win.on("maximize", () => this.emit("window:change", true))
      win.on("unmaximize", () => this.emit("window:change", false))
    } else {
      throw new Error("[chrome] 主窗口未创建，ChromeService 必须在 createMainWindow() 之后实例化")
    }
  }

  /** 最小化主窗口。 */
  @Handle("window:minimize")
  minimize(): void {
    this.ctx.mainWindow.get()?.minimize()
  }

  /** 切换最大化/还原状态。 */
  @Handle("window:maximize")
  maximize(): void {
    const win = this.ctx.mainWindow.get()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  }

  /** 关闭主窗口。 */
  @Handle("window:close")
  close(): void {
    this.ctx.mainWindow.get()?.close()
  }

  /** 获取当前最大化状态。 */
  @Handle("window:state")
  state(): boolean {
    return this.ctx.mainWindow.get()?.isMaximized() ?? false
  }

  /**
   * 打开子窗口并加载指定路径。
   * 直接使用 BrowserWindow —— 子窗口创建不属于可复用业务逻辑。
   * @param targetPath 子窗口要加载的路由路径
   */
  @Handle("open")
  open(targetPath: string): void {
    const child = new BrowserWindow({ webPreferences: { preload: preloadPath } })
    if (viteDevServerUrl) {
      child.loadURL(`${viteDevServerUrl}#${targetPath}`)
    } else {
      child.loadFile(indexHtml, { hash: targetPath })
    }
  }
}
