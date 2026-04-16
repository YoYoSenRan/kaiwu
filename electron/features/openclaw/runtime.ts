import type { CompatResult, InvokeArgs, InvokeResult, OpenClawStatus } from "./types"
import type { PluginServer } from "./plugin/transport"
import type { OpenclawEmitter } from "./push"
import type { GatewayClient } from "./gateway/client"
import { spawn } from "node:child_process"
import { isWin } from "../../infra/env"
import { scope } from "../../infra/logger"
import { detectGateway } from "./gateway/detection"
import { startPluginServer } from "./plugin/transport"
import { checkCompatibility } from "./plugin/compat"
import { removeHandshake, writeHandshake } from "./plugin/handshake"
import { detectPluginInstall, removePluginFiles, syncPlugin } from "./plugin/sync"

const log = scope("openclaw")

/** 调用 `openclaw gateway restart` 的超时（ms）。 */
const RESTART_TIMEOUT_MS = 10_000
/** fetch 插件 HTTP 路由的超时（ms）。 */
const INVOKE_TIMEOUT_MS = 8_000

/**
 * OpenClaw 运行时门面。
 *
 * 持有本地 bridge WS server 的生命周期，并聚合 gateway 探测、兼容性校验、
 * 插件文件同步、RPC 重启、HTTP invoke 等跨组件操作。
 *
 * 文件原名 `lifecycle.ts`，与 framework/lifecycle 的启动阶段管理类冲突，
 * 改为 runtime 强调"OpenClaw 运行期控制"而非"应用生命周期"。
 */
export class OpenclawRuntime {
  private pluginServer: PluginServer | null = null

  constructor(
    private readonly push: OpenclawEmitter,
    private readonly gateway: GatewayClient,
  ) {}

  /** 已启动的 bridge 插件服务器，未启动时返回 null。invokePlugin 等需要鉴权 token 时使用。 */
  getPluginServer(): PluginServer | null {
    return this.pluginServer
  }

  /**
   * 启动本地 bridge WS server。OpenclawService.onReady 时调用一次，幂等。
   * 启动后自动刷新 handshake 文件（如果插件已安装），避免插件用上一次 kaiwu 进程
   * 留下的 stale port/token 去连接一个已死的 WS。
   */
  async startBridge(): Promise<PluginServer | null> {
    if (this.pluginServer) return this.pluginServer
    try {
      this.pluginServer = await startPluginServer()
      log.info(`桥接服务启动于 127.0.0.1:${this.pluginServer.info.port}`)
      await this.refreshHandshakeIfInstalled()
      return this.pluginServer
    } catch (err) {
      log.error(`桥接服务启动失败: ${(err as Error).message}`)
      return null
    }
  }

  /** 关闭 bridge server 和 gateway 连接（kaiwu 退出时调用）。 */
  async stopBridge(): Promise<void> {
    this.gateway.disconnect()
    if (!this.pluginServer) return
    await this.pluginServer.close()
    this.pluginServer = null
  }

  /** 探测 OpenClaw gateway + kaiwu 插件安装状态，并推送给 renderer。用户主动触发，跳过缓存。 */
  async detect(): Promise<OpenClawStatus> {
    const gateway = await detectGateway(true)
    const pluginInfo = gateway.extensionsDir ? await detectPluginInstall(gateway.extensionsDir) : { installed: false, version: null }
    const status: OpenClawStatus = {
      ...gateway,
      bridgeInstalled: pluginInfo.installed,
      installedBridgeVersion: pluginInfo.version,
    }
    this.push.pluginStatus(status)
    return status
  }

  /** 校验 kaiwu 对当前 OpenClaw 的兼容性。 */
  async checkCompat(): Promise<CompatResult> {
    const gateway = await detectGateway()
    return checkCompatibility(gateway.version)
  }

  /**
   * 同步插件源码到 OpenClaw extensions 目录并写入 handshake。
   * 先做兼容性校验，不兼容直接抛错。
   */
  async installPlugin(): Promise<OpenClawStatus> {
    const gateway = await detectGateway()
    if (!gateway.installed || !gateway.extensionsDir) {
      throw new Error("未检测到 OpenClaw 安装（configDir 不存在），请先安装 OpenClaw")
    }
    const compat = checkCompatibility(gateway.version)
    if (!compat.compatible) {
      throw new Error(compat.reason ?? "kaiwu 与当前 OpenClaw 版本不兼容")
    }
    await syncPlugin(gateway.extensionsDir)
    if (this.pluginServer) {
      await writeHandshake({
        extensionsDir: gateway.extensionsDir,
        port: this.pluginServer.info.port,
        token: this.pluginServer.info.token,
        pid: this.pluginServer.info.pid,
      })
    } else {
      log.warn("安装插件时桥接服务未运行，插件将处于空闲状态")
    }
    return await this.detect()
  }

  /** 卸载已同步的插件和 handshake 文件。 */
  async uninstallPlugin(): Promise<OpenClawStatus> {
    const gateway = await detectGateway()
    if (gateway.extensionsDir) {
      await removeHandshake(gateway.extensionsDir)
      await removePluginFiles(gateway.extensionsDir)
    }
    return await this.detect()
  }

  /** 调用 `openclaw gateway restart` 重启 gateway 进程。 */
  async restart(): Promise<{ ok: boolean; error?: string }> {
    return await new Promise((resolve) => {
      // Windows 上 spawn 默认不会解析 .cmd/.bat，用 shell 模式确保能找到 openclaw 入口
      const child = spawn("openclaw", ["gateway", "restart"], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: isWin,
      })
      let stderr = ""
      const timer = setTimeout(() => {
        child.kill()
        resolve({ ok: false, error: "openclaw gateway restart timeout" })
      }, RESTART_TIMEOUT_MS)
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf-8")))
      child.once("error", (err) => {
        clearTimeout(timer)
        resolve({ ok: false, error: err.message })
      })
      child.once("exit", (code) => {
        clearTimeout(timer)
        if (code === 0) resolve({ ok: true })
        else resolve({ ok: false, error: stderr || `exit ${code}` })
      })
    })
  }

  /**
   * 通过 OpenClaw gateway 调用 kaiwu 插件的 HTTP 路由。
   * kaiwu → OpenClaw → 插件 的入站通道。
   */
  async invoke(args: InvokeArgs): Promise<InvokeResult> {
    const gateway = await detectGateway()
    if (!gateway.running || !gateway.gatewayPort) {
      return { ok: false, error: { message: "OpenClaw gateway 未运行" } }
    }
    if (!this.pluginServer) {
      return { ok: false, error: { message: "bridge server 未启动，无法鉴权" } }
    }
    const url = `http://127.0.0.1:${gateway.gatewayPort}/kaiwu/invoke`
    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), INVOKE_TIMEOUT_MS)
      const res = await fetch(url, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.pluginServer.info.token}`,
        },
        body: JSON.stringify(args),
      })
      clearTimeout(timer)
      return (await res.json()) as InvokeResult
    } catch (err) {
      return { ok: false, error: { message: (err as Error).message } }
    }
  }

  /**
   * 如果插件已同步到 extensions 目录，用当前 bridge server 的 port/token 重写 handshake。
   * 用户下次重启 gateway 时，插件会读到新 handshake 并连上来。
   */
  private async refreshHandshakeIfInstalled(): Promise<void> {
    if (!this.pluginServer) return
    const gateway = await detectGateway()
    if (!gateway.extensionsDir) return
    const pluginInfo = await detectPluginInstall(gateway.extensionsDir)
    if (!pluginInfo.installed) return
    try {
      await writeHandshake({
        extensionsDir: gateway.extensionsDir,
        port: this.pluginServer.info.port,
        token: this.pluginServer.info.token,
        pid: this.pluginServer.info.pid,
      })
      log.info("握手信息已刷新")
    } catch (err) {
      log.warn(`刷新握手信息失败: ${(err as Error).message}`)
    }
  }
}
