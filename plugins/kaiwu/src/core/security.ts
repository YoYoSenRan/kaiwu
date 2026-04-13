import type { BridgeConfig } from "./handshake.js"

/**
 * 构造调用 kaiwu 本地 HTTP 接口时使用的 Bearer auth header。
 * 当前能力层未实现；文件先落位，等业务路由接入时复用。
 */
export function makeAuthHeader(config: BridgeConfig): string {
  return `Bearer ${config.token}`
}
