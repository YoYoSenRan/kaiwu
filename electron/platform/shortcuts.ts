import { globalShortcut } from "electron"
import { scope } from "../infra/logger"
import { Phase } from "../framework/lifecycle"
import type { AppContext } from "../app/context"
import type { AppModule } from "../framework/module"

const shortcutsLog = scope("shortcuts")

/** 全局快捷键：应用不在前台也能触发。 */
const TOGGLE_SHORTCUT = "CommandOrControl+Shift+K"

/**
 * 全局快捷键模块。纯 OS 副作用，没有 IPC handler。
 *
 * 注册 Cmd+Shift+K 切换主窗口显示/隐藏。dispose 时反注册。
 */
export const shortcutsModule: AppModule = {
  name: "shortcuts",
  phase: Phase.Ready,
  setup(ctx) {
    const ok = globalShortcut.register(TOGGLE_SHORTCUT, () => toggleMainWindow(ctx))
    if (!ok) {
      shortcutsLog.warn(`注册全局快捷键 ${TOGGLE_SHORTCUT} 失败，可能被其他应用占用`)
    }
  },
  dispose() {
    globalShortcut.unregister(TOGGLE_SHORTCUT)
  },
}

function toggleMainWindow(ctx: AppContext): void {
  const win = ctx.mainWindow.get()
  if (!win) return
  if (win.isVisible() && win.isFocused()) {
    win.hide()
  } else {
    win.show()
    win.focus()
  }
}
