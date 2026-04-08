/** chrome feature 的 IPC 通道常量（窗口外壳：标题栏、最大化、关闭等） */
export const chromeChannels = {
  minimize: "chrome:minimize",
  maximize: "chrome:maximize",
  close: "chrome:close",
  isMaximized: "chrome:is-maximized",
  /** 主进程 → 渲染进程推送：最大化状态变化 */
  maximizedChanged: "chrome:maximized-changed",
  /** 打开新窗口（示例 API） */
  openWin: "chrome:open",
} as const
