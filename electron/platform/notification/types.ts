/** 通知选项 */
export interface NotifyOptions {
  title: string
  body: string
  /** 是否静音，默认 false */
  silent?: boolean
}

export interface NotificationBridge {
  /** 显示一条系统通知 */
  show: (options: NotifyOptions) => Promise<void>
}
