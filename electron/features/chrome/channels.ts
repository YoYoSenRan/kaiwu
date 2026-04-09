/** chrome feature 的 IPC 通道常量（窗口外壳：标题栏、最大化、关闭等） */
export const chromeChannels = {
  /** 窗口控制 */
  window: {
    minimize: "chrome:window:minimize",
    maximize: "chrome:window:maximize",
    close: "chrome:window:close",
    state: "chrome:window:state",
    /** 主进程 → 渲染进程推送：最大化状态变化 */
    change: "chrome:window:change",
  },
  /** 打开新窗口 */
  open: "chrome:open",
} as const
