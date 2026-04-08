/** updater feature 的 IPC 通道常量 */
export const updaterChannels = {
  /** 手动触发检查更新 */
  check: "updater:check",
  /** 开始下载已检查到的更新 */
  startDownload: "updater:start-download",
  /** 退出并安装已下载的更新 */
  quitAndInstall: "updater:quit-and-install",

  /** 主进程 → 渲染进程：检查结果（有/无更新） */
  canAvailable: "updater:can-available",
  /** 主进程 → 渲染进程：下载进度 */
  downloadProgress: "updater:download-progress",
  /** 主进程 → 渲染进程：下载完成 */
  downloaded: "updater:downloaded",
  /** 主进程 → 渲染进程：出错 */
  error: "updater:error",
} as const
