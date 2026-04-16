import type { EmitEvent } from "../types"
import type { CompatibilityResult, OpenClawStatus } from "./types"
import { spawn } from "node:child_process"
import { isWin } from "../../../infra/env"
import { scope } from "../../../infra/logger"
import { detectGateway } from "../gateway/detection"
import { checkCompatibility as computeCompatibility } from "./compat"
import { removeHandshake, writeHandshake } from "./handshake"
import { detectPluginInstall, removePluginFiles, syncPlugin } from "./sync"

const log = scope("openclaw:ops")

/** 调用 `openclaw gateway restart` 的超时(ms)。 */
const RESTART_TIMEOUT_MS = 10_000

/** 桥接服务鉴权所需的凭证片段。 */
export interface BridgeCredentials {
  port: number
  token: string
  pid: number
}

/** 探测 OpenClaw gateway + kaiwu 插件安装状态, 并推送给 renderer。用户主动触发, 跳过缓存。 */
export async function detectStatus(emitEvent: EmitEvent): Promise<OpenClawStatus> {
  const gateway = await detectGateway(true)
  const pluginInfo = gateway.extensionsDir ? await detectPluginInstall(gateway.extensionsDir) : { installed: false, version: null }
  const status: OpenClawStatus = {
    ...gateway,
    bridgeInstalled: pluginInfo.installed,
    installedBridgeVersion: pluginInfo.version,
  }
  emitEvent("plugin:status", status)
  return status
}

/** 校验 kaiwu 对当前 OpenClaw 的兼容性。 */
export async function checkCompatibility(): Promise<CompatibilityResult> {
  const gateway = await detectGateway()
  return computeCompatibility(gateway.version)
}

/**
 * 同步插件源码到 OpenClaw extensions 目录并写入 handshake。
 * 先做兼容性校验,不兼容直接抛错。
 */
export async function installBridge(creds: BridgeCredentials | null, emitEvent: EmitEvent): Promise<OpenClawStatus> {
  const gateway = await detectGateway()
  if (!gateway.installed || !gateway.extensionsDir) {
    throw new Error("未检测到 OpenClaw 安装(configDir 不存在),请先安装 OpenClaw")
  }
  if (gateway.deployment === "remote") {
    throw new Error("远程部署不支持插件自动同步，请手动配置")
  }
  const compat = computeCompatibility(gateway.version)
  if (!compat.compatible) {
    throw new Error(compat.reason ?? "kaiwu 与当前 OpenClaw 版本不兼容")
  }
  try {
    await syncPlugin(gateway.extensionsDir)
  } catch (err) {
    if (gateway.deployment === "docker") {
      throw new Error(`Docker 部署下插件同步失败，请确认已卷映射 extensions 目录: ${(err as Error).message}`, { cause: err })
    }
    throw err
  }
  if (creds) {
    await writeHandshake({
      extensionsDir: gateway.extensionsDir,
      port: creds.port,
      token: creds.token,
      pid: creds.pid,
    })
  } else {
    log.warn("安装插件时桥接服务未运行, 插件将处于空闲状态")
  }
  return await detectStatus(emitEvent)
}

/** 卸载已同步的插件和 handshake 文件。 */
export async function uninstallBridge(emitEvent: EmitEvent): Promise<OpenClawStatus> {
  const gateway = await detectGateway()
  if (gateway.deployment === "remote") {
    return await detectStatus(emitEvent)
  }
  if (gateway.extensionsDir) {
    await removeHandshake(gateway.extensionsDir)
    await removePluginFiles(gateway.extensionsDir)
  }
  return await detectStatus(emitEvent)
}

/** 调用 `openclaw gateway restart` 重启 gateway 进程。 */
export async function restartGateway(): Promise<{ ok: boolean; error?: string }> {
  const gateway = await detectGateway()
  if (gateway.deployment !== "local") {
    return { ok: false, error: "仅本地进程部署支持重启" }
  }
  return await new Promise((resolve) => {
    const child = spawn("openclaw", ["gateway", "restart"], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: isWin,
    })
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill()
      resolve({ ok: false, error: "openclaw gateway restart timeout" })
    }, RESTART_TIMEOUT_MS)
    child.stderr.on("data", (data: Buffer) => (stderr += data.toString("utf-8")))
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
