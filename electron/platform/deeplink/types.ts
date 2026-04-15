/** 解析后的深度链接数据 */
export interface DeepLinkPayload {
  /** 协议后的路径部分（host + pathname） */
  path: string
  /** URL 查询参数 */
  query: Record<string, string>
}

/** Deeplink 推送的事件（非 Controller，由 platform/deeplink/service.ts 直接 webContents.send）。 */
export interface DeeplinkEvents {
  "event:received": DeepLinkPayload
}

export interface DeeplinkBridge {
  /** 订阅深度链接事件，返回取消订阅函数 */
  onReceived: (listener: (payload: DeepLinkPayload) => void) => () => void
}
