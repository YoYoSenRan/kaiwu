/** 解析后的深度链接数据 */
export interface DeepLinkPayload {
  /** 协议后的路径部分（host + pathname） */
  path: string
  /** URL 查询参数 */
  query: Record<string, string>
}

export interface DeeplinkBridge {
  /** 订阅深度链接事件，返回取消订阅函数 */
  onReceived: (listener: (payload: DeepLinkPayload) => void) => () => void
}
