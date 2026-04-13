import { getMainWindow } from "../../core/window"

/** 最小化主窗口。 */
export function minimizeWindow(): void {
  getMainWindow()?.minimize()
}

/** 切换最大化/还原状态。 */
export function toggleMaximize(): void {
  const win = getMainWindow()
  if (!win) return
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
}

/** 关闭主窗口。 */
export function closeWindow(): void {
  getMainWindow()?.close()
}

/** 获取当前最大化状态。 */
export function isMaximized(): boolean {
  return getMainWindow()?.isMaximized() ?? false
}
