/** updater feature 的 IPC 通道常量 */
export const updaterChannels = {
  /** 主动操作 */
  action: {
    /** 手动触发检查更新 */
    check: "updater:action:check",
    /** 退出并安装已下载的更新 */
    install: "updater:action:install",
    /** 开始下载已检查到的更新 */
    download: "updater:action:download",
  },
  /** 主进程 → 渲染进程推送事件 */
  event: {
    /** 下载完成 */
    done: "updater:event:done",
    /** 出错 */
    error: "updater:event:error",
    /** 下载进度 */
    progress: "updater:event:progress",
    /** 检查结果（有/无更新） */
    available: "updater:event:available",
  },
} as const
