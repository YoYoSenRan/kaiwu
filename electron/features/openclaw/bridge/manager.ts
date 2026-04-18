import type { BridgeServer } from "./server"
import { scope } from "../../../infra/logger"
import { startBridgeServer } from "./server"

const log = scope("openclaw:bridge-manager")

/**
 * 本地 bridge WS server 的生命周期。
 *
 * PluginService.onReady 启动一次,onShutdown 关闭。
 * 只负责 WS server 的启停 —— connect 文件刷新等跨域编排由 service 完成,BridgeManager 不依赖 gateway/scan。
 */
export class BridgeManager {
  private server: BridgeServer | null = null

  /** 启动 WS server。幂等。失败返回 null 不抛错,方便调用端只做一次 null 检查。 */
  async start(): Promise<BridgeServer | null> {
    if (this.server) return this.server
    try {
      this.server = await startBridgeServer()
      log.info(`桥接服务启动于 127.0.0.1:${this.server.getCredentials().port}`)
      return this.server
    } catch (err) {
      log.error(`桥接服务启动失败: ${(err as Error).message}`)
      return null
    }
  }

  /** 关闭 WS server。kaiwu 退出时调用。 */
  async stop(): Promise<void> {
    if (!this.server) return
    await this.server.close()
    this.server = null
  }

  /** 当前 server,未启动时返回 null。call 等需要鉴权 token 时使用。 */
  getServer(): BridgeServer | null {
    return this.server
  }
}
