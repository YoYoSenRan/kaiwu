/** 自定义协议名，用于唤起应用：electron-vite-react://some/path?k=v */
export const PROTOCOL = "electron-vite-react"

export const deeplinkChannels = {
  /** 深度链接相关事件 */
  event: {
    /** 主进程 → 渲染进程推送：解析后的深度链接 */
    received: "deeplink:event:received",
  },
} as const
