export interface ChromeBridge {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  openWin: (path: string) => Promise<void>
  /** 订阅最大化状态变化，返回取消订阅函数 */
  onMaximizedChange: (listener: (isMaximized: boolean) => void) => () => void
}
