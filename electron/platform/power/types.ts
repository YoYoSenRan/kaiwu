/** 电源状态事件类型 */
export type PowerEvent = "suspend" | "resume" | "lock" | "unlock"

/** Power controller 可推送的事件。 */
export interface PowerEvents {
  change: PowerEvent
}

export interface PowerBridge {
  /** 订阅电源/锁屏状态变化，返回取消订阅函数 */
  onChange: (listener: (event: PowerEvent) => void) => () => void
}
