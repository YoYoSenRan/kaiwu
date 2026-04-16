import type { PluginServer } from "./transport"
import { scope } from "../../../infra/logger"
import { startPluginServer } from "./transport"
import { writeHandshake } from "./handshake"
import { detectPluginInstall } from "./sync"
import { detectGateway } from "../gateway/detection"

const log = scope("openclaw:host")

/**
 * 本地 bridge WS server 的生命周期。
 *
 * OpenclawService.onReady 启动一次,onShutdown 关闭。
 * 启动后自动刷新 handshake 文件(如果插件已安装),避免插件用上一次 kaiwu 进程
 * 留下的 stale port/token 去连接一个已死的 WS。
 */
export class PluginHost {
  private server: PluginServer | null = null

  /** 启动 WS server。幂等。失败返回 null 不抛错,方便调用端只做一次 null 检查。 */
  async start(): Promise<PluginServer | null> {
    if (this.server) return this.server
    try {
      this.server = await startPluginServer()
      log.info(`桥接服务启动于 127.0.0.1:${this.server.info.port}`)
      await this.syncHandshake()
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

  /** 当前 server,未启动时返回 null。invoke 等需要鉴权 token 时使用。 */
  getServer(): PluginServer | null {
    return this.server
  }

  /** 如果插件已同步到 extensions, 用当前 server 的 port/token 重写 handshake。 */
  private async syncHandshake(): Promise<void> {
    if (!this.server) return
    const gateway = await detectGateway()
    if (!gateway.extensionsDir) return
    const pluginInfo = await detectPluginInstall(gateway.extensionsDir)
    if (!pluginInfo.installed) return
    try {
      await writeHandshake({
        extensionsDir: gateway.extensionsDir,
        port: this.server.info.port,
        token: this.server.info.token,
        pid: this.server.info.pid,
      })
      log.info("握手信息已刷新")
    } catch (err) {
      log.warn(`刷新握手信息失败: ${(err as Error).message}`)
    }
  }
}
