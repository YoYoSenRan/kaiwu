import type { ProgressInfo } from "electron-updater"

/** 更新检查结果：告诉渲染进程是否有新版本可用 */
export interface UpdateAvailability {
  update: boolean
  version: string
  newVersion?: string
}

/** 更新流程中的错误信息 */
export interface UpdaterError {
  message: string
  error: Error
}

/** check() 的返回值：失败时返回错误信息对象，成功但不在生产环境时返回 null */
export type CheckResult = UpdaterError | null

export interface UpdaterBridge {
  check: () => Promise<CheckResult>
  startDownload: () => Promise<void>
  quitAndInstall: () => Promise<void>

  /** 订阅"有可用更新/无可用更新"事件，返回取消订阅函数 */
  onCanAvailable: (listener: (info: UpdateAvailability) => void) => () => void
  /** 订阅下载进度事件，返回取消订阅函数 */
  onDownloadProgress: (listener: (info: ProgressInfo) => void) => () => void
  /** 订阅下载完成事件，返回取消订阅函数 */
  onDownloaded: (listener: () => void) => () => void
  /** 订阅错误事件，返回取消订阅函数 */
  onError: (listener: (info: UpdaterError) => void) => () => void
}
