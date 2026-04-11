/** chrome feature 的 IPC 通道常量（窗口外壳：标题栏、最大化、关闭等） */
export const chromeChannels = {
  /** 打开新窗口 */
  open: "chrome:open",
  /** 窗口控制 */
  window: {
    close: "chrome:window:close",
    state: "chrome:window:state",
    /** 主进程 → 渲染进程推送：最大化状态变化 */
    change: "chrome:window:change",
    minimize: "chrome:window:minimize",
    maximize: "chrome:window:maximize",
  },
} as const
