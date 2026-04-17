import type { CompatibilityResult, OpenClawStatus } from "../plugin/types"
import type { Capabilities } from "../gateway/types"
import { Controller, Handle, IpcController } from "../../../framework"
import { readBridge } from "../plugin/sync"
import { checkCompatibility as computeCompatibility } from "../plugin/compatibility"
import { runCli } from "../gateway/cli"
import { scanner, emitStatus } from "../container"

/** 调用 `openclaw gateway restart` 的超时(ms)。 */
const RESTART_TIMEOUT_MS = 10_000

/**
 * 计算 openclaw 当前完整状态 = gateway 扫描结果 + bridge 安装读取。
 * @param refresh true 跳过 scanner 的 TTL 缓存强制重扫
 */
export async function currentStatus(refresh = false): Promise<OpenClawStatus> {
  const gateway = refresh ? await scanner.refresh() : await scanner.scan()
  const bridge = gateway.extensionsDir ? await readBridge(gateway.extensionsDir) : { installed: false, version: null }
  return {
    ...gateway,
    bridgeInstalled: bridge.installed,
    installedBridgeVersion: bridge.version,
  }
}

/**
 * 计算状态并推送到 `status:change` 订阅者。
 * PluginService.install/uninstall 和 StatusService.detect 共用此函数消除重复。
 */
export async function pushStatus(refresh = false): Promise<OpenClawStatus> {
  const status = await currentStatus(refresh)
  emitStatus(status)
  return status
}

/**
 * 安装扫描 / 兼容性校验 / 部署能力 / gateway 重启。
 *
 * 注意本 Controller 自身无状态 —— 所有方法都走 container.scanner 或直接调 CLI(restart)。
 * 不持有 BridgeManager / GatewayClient 引用。
 */
@Controller("openclaw.status")
export class StatusService extends IpcController {
  /** 用户主动刷新状态。强制重扫后推送到订阅者。 */
  @Handle("detect")
  detect(): Promise<OpenClawStatus> {
    return pushStatus(true)
  }

  /** 校验 kaiwu 对当前 OpenClaw 版本的兼容性。读版本号走缓存,幂等。 */
  @Handle("check")
  async check(): Promise<CompatibilityResult> {
    const gateway = await scanner.scan()
    return computeCompatibility(gateway.version)
  }

  /** 返回当前部署形态下可用的能力矩阵(pluginBridge / pluginSync 等)。 */
  @Handle("capabilities")
  async capabilities(): Promise<Capabilities> {
    const gateway = await scanner.scan()
    return gateway.capabilities
  }

  /**
   * 重启本地 gateway 进程。只在 local 部署下可用。
   * 非 local 部署或执行失败都抛错,renderer 通过 IPC reject 得到错误。
   */
  @Handle("restart")
  async restart(): Promise<void> {
    const gateway = await scanner.scan()
    if (gateway.deployment !== "local") {
      throw new Error("仅本地进程部署支持重启")
    }
    const r = await runCli(["gateway", "restart"], RESTART_TIMEOUT_MS)
    if (r.code === 0) return
    if (r.code === null) throw new Error("openclaw gateway restart timeout")
    throw new Error(r.stderr || `exit ${r.code}`)
  }
}
