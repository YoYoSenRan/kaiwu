/** Chrome controller 可推送的事件。 */
export interface ChromeEvents {
  "window:change": boolean
}

export interface ChromeBridge {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  state: () => Promise<boolean>
  open: (path: string) => Promise<void>
  /** 订阅最大化状态变化，返回取消订阅函数 */
  onChange: (listener: (isMaximized: boolean) => void) => () => void
}
