import type { IpcLifecycle } from "../../../framework"
import type { InvokeArgs, InvokeResult } from "../contracts/plugin"
import type { OpenClawStatus } from "../contracts/status"
import { Controller, Handle, IpcController } from "../../../framework"
import { scope } from "../../../infra/logger"
import { BridgeManager } from "./manager"
import { toMonitorEvent } from "./router"
import { call as callBridge } from "./call"
import { writeConnectFile, removeConnectFile } from "./connect"
import { readBridge, removePluginFiles, syncPlugin } from "./sync"
import { checkCompatibility as computeCompatibility } from "../discovery/version"
import { pushStatus } from "../status/service"
import { scanner, setBridgeServer } from "../runtime"
import { publishPluginEvent, publishPluginMonitor } from "../events/publisher"

const log = scope("openclaw:bridge")

/**
 * 插件桥接 server 生命周期 + kaiwu bridge 插件管理。
 *
 * 持有 BridgeManager(本地 127.0.0.1 WS server),onReady 启动、onShutdown 停止。
 * 启动后订阅插件事件,按 channel 拆分到 `plugin:event` / `plugin:monitor` 两个 IPC 通道。
 *
 * install/uninstall 跨域操作文件系统(extensions/kaiwu/) + connect 文件,
 * 完成后通过 pushStatus 推给 StatusService 订阅者。
 */
@Controller("openclaw.plugin")
export class BridgeService extends IpcController implements IpcLifecycle {
  private readonly manager = new BridgeManager()

  /**
   * 启动 WS server,注册事件分发,刷 connect 文件。
   * server 启动失败时直接 return,其他 service 通过 getBridgeServer() 读到 null 降级处理。
   */
  async onReady(): Promise<void> {
    const server = await this.manager.start()
    if (!server) return
    setBridgeServer(server)
    server.onEvent((event) => {
      const monitor = toMonitorEvent(event)
      if (monitor) publishPluginMonitor(monitor)
      else publishPluginEvent(event)
    })
    await this.refreshConnectFile()
  }

  /**
   * 插件已同步过的话,用当前 server 的 port/token 重写 connect 文件,
   * 防止插件拿上一次 kaiwu 进程的 stale 凭证连已死的 WS。
   */
  private async refreshConnectFile(): Promise<void> {
    const server = this.manager.getServer()
    if (!server) return
    const gateway = await scanner.scan()
    if (!gateway.extensionsDir) return
    const bridge = await readBridge(gateway.extensionsDir)
    if (!bridge.installed) return
    try {
      await writeConnectFile({ extensionsDir: gateway.extensionsDir, ...server.getCredentials() })
      log.info("connect 文件已刷新")
    } catch (err) {
      log.warn(`刷新 connect 文件失败: ${(err as Error).message}`)
    }
  }

  /**
   * 同步插件源码到 OpenClaw extensions 目录 + 写 connect 文件。
   * 前置校验:installed / 非 remote 部署 / 版本兼容。任一不满足抛错。
   * @throws 不可安装时抛带可读原因的 Error
   */
  @Handle("install")
  async install(): Promise<OpenClawStatus> {
    const gateway = await scanner.scan()
    if (!gateway.installed || !gateway.extensionsDir) {
      throw new Error("未检测到 OpenClaw 安装(configDir 不存在),请先安装 OpenClaw")
    }
    if (gateway.deployment === "remote") {
      throw new Error("远程部署不支持插件自动同步,请手动配置")
    }
    const compat = computeCompatibility(gateway.version)
    if (!compat.compatible) {
      throw new Error(compat.reason ?? "kaiwu 与当前 OpenClaw 版本不兼容")
    }
    try {
      await syncPlugin(gateway.extensionsDir)
    } catch (err) {
      if (gateway.deployment === "docker") {
        throw new Error(`Docker 部署下插件同步失败,请确认已卷映射 extensions 目录: ${(err as Error).message}`, { cause: err })
      }
      throw err
    }
    const server = this.manager.getServer()
    if (server) {
      await writeConnectFile({ extensionsDir: gateway.extensionsDir, ...server.getCredentials() })
    } else {
      log.warn("安装插件时桥接服务未运行, 插件将处于空闲状态")
    }
    return pushStatus(true)
  }

  /** 移除 extensions/kaiwu/ 下的插件文件和 connect 文件。远程部署下是 no-op。 */
  @Handle("uninstall")
  async uninstall(): Promise<OpenClawStatus> {
    const gateway = await scanner.scan()
    if (gateway.deployment !== "remote" && gateway.extensionsDir) {
      await removeConnectFile(gateway.extensionsDir)
      await removePluginFiles(gateway.extensionsDir)
    }
    return pushStatus(true)
  }

  /**
   * 通过 OpenClaw gateway 的 HTTP /kaiwu/invoke 调用插件路由。
   * kaiwu → OpenClaw gateway → 插件的入站调用通道。
   */
  @Handle("invoke")
  invoke(args: InvokeArgs): Promise<InvokeResult> {
    const token = this.manager.getServer()?.getCredentials().token ?? null
    return callBridge(token, args)
  }

  /** 关闭本地 WS server。2s 上限避免 before-quit 被卡住。 */
  async onShutdown(): Promise<void> {
    setBridgeServer(null)
    await Promise.race([this.manager.stop(), new Promise<void>((resolve) => setTimeout(resolve, 2000))])
  }
}
