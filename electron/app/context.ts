import type { BrowserWindow, WebContents } from "electron"
import type { Lifecycle } from "../framework/lifecycle"

/** 主窗口引用：启动过程中先 set，各处通过 get 拿最新值。 */
export interface MainWindowRef {
  get(): BrowserWindow | null
  set(win: BrowserWindow | null): void
  webContents(): WebContents | null
}

/**
 * 应用启动上下文。由 bootstrap 创建一次，通过 module.setup(ctx) 显式传递。
 * 取代之前散落的 module-level 全局（getMainWindow 等）。
 */
export interface AppContext {
  readonly mainWindow: MainWindowRef
  readonly lifecycle: Lifecycle
}

function createMainWindowRef(): MainWindowRef {
  let win: BrowserWindow | null = null
  const alive = () => (win && !win.isDestroyed() ? win : null)
  return {
    get: () => alive(),
    set: (w) => {
      win = w
    },
    webContents: () => alive()?.webContents ?? null,
  }
}

export function createAppContext(opts: { lifecycle: Lifecycle }): AppContext {
  return {
    mainWindow: createMainWindowRef(),
    lifecycle: opts.lifecycle,
  }
}
