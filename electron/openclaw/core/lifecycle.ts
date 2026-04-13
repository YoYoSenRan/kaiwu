import type { CompatResult, InvokeArgs, InvokeResult, OpenClawStatus } from "../types"
import type { PluginServer } from "./transport"

import { spawn } from "node:child_process"
import { isWin } from "../../core/env"
import { scope } from "../../core/logger"
import { stopGatewayConnection } from "./connection"
import { checkCompatibility } from "./compat"
import { detectGateway } from "./gateway"
import { removeHandshake, writeHandshake } from "./handshake"
import { detectPluginInstall, removePluginFiles, syncPlugin } from "./plugin"
import { pushStatusChanged } from "../push"
import { startPluginServer } from "./transport"

const openclawLog = scope("openclaw")

/** 调用 `openclaw gateway restart` 的超时（ms）。 */
const RESTART_TIMEOUT_MS = 10_000
/** fetch 插件 HTTP 路由的超时（ms）。 */
const INVOKE_TIMEOUT_MS = 8_000

let pluginServer: PluginServer | null = null

/**
 * 启动本地 bridge WS server。kaiwu 启动时调用一次；幂等。
 * 返回的 PluginServer 可供上层绑定 onEvent。
 * 启动后自动刷新 handshake 文件（如果插件已安装），避免插件用上一次 kaiwu 进程
 * 留下的 stale port/token 去连接一个已死的 WS。
 */
export async function startPlugin(): Promise<PluginServer | null> {
  if (pluginServer) return pluginServer
  try {
    pluginServer = await startPluginServer()
    openclawLog.info(`桥接服务启动于 127.0.0.1:${pluginServer.info.port}`)
    await refreshHandshakeIfInstalled()
    return pluginServer
  } catch (err) {
    openclawLog.error(`桥接服务启动失败: ${(err as Error).message}`)
    return null
  }
}

/**
 * 如果插件已同步到 extensions 目录，用当前 bridge server 的 port/token 重写 handshake。
 * 用户下次重启 gateway 时，插件会读到新 handshake 并连上来。
 */
async function refreshHandshakeIfInstalled(): Promise<void> {
  if (!pluginServer) return
  const gateway = await detectGateway()
  if (!gateway.extensionsDir) return
  const pluginInfo = await detectPluginInstall(gateway.extensionsDir)
  if (!pluginInfo.installed) return
  try {
    await writeHandshake({
      extensionsDir: gateway.extensionsDir,
      port: pluginServer.info.port,
      token: pluginServer.info.token,
      pid: pluginServer.info.pid,
    })
    openclawLog.info("握手信息已刷新")
  } catch (err) {
    openclawLog.warn(`刷新握手信息失败: ${(err as Error).message}`)
  }
}

/** 关闭 bridge server 和 gateway 连接（kaiwu 退出时调用）。 */
export async function stopPlugin(): Promise<void> {
  stopGatewayConnection()
  if (!pluginServer) return
  await pluginServer.close()
  pluginServer = null
}

/**
 * 探测 OpenClaw gateway + kaiwu 插件安装状态。
 * gateway 探测和插件探测分属两层，这里负责组合并推送给 renderer。
 */
export async function detect(): Promise<OpenClawStatus> {
  const gateway = await detectGateway()
  const pluginInfo = gateway.extensionsDir ? await detectPluginInstall(gateway.extensionsDir) : { installed: false, version: null }
  const status: OpenClawStatus = {
    ...gateway,
    bridgeInstalled: pluginInfo.installed,
    installedBridgeVersion: pluginInfo.version,
  }
  pushStatusChanged(status)
  return status
}

/** 校验 kaiwu 对当前 OpenClaw 的兼容性。 */
export async function checkCompat(): Promise<CompatResult> {
  const gateway = await detectGateway()
  return checkCompatibility(gateway.version)
}

/**
 * 同步插件源码到 OpenClaw extensions 目录并写入 handshake。
 * 先做兼容性校验，不兼容直接抛错。
 */
export async function installPlugin(): Promise<OpenClawStatus> {
  const gateway = await detectGateway()
  if (!gateway.installed || !gateway.extensionsDir) {
    throw new Error("未检测到 OpenClaw 安装（configDir 不存在），请先安装 OpenClaw")
  }
  const compat = checkCompatibility(gateway.version)
  if (!compat.compatible) {
    throw new Error(compat.reason ?? "kaiwu 与当前 OpenClaw 版本不兼容")
  }
  await syncPlugin(gateway.extensionsDir)
  if (pluginServer) {
    await writeHandshake({
      extensionsDir: gateway.extensionsDir,
      port: pluginServer.info.port,
      token: pluginServer.info.token,
      pid: pluginServer.info.pid,
    })
  } else {
    openclawLog.warn("安装插件时桥接服务未运行，插件将处于空闲状态")
  }
  return await detect()
}

/** 卸载已同步的插件和 handshake 文件。 */
export async function uninstallPlugin(): Promise<OpenClawStatus> {
  const gateway = await detectGateway()
  if (gateway.extensionsDir) {
    await removeHandshake(gateway.extensionsDir)
    await removePluginFiles(gateway.extensionsDir)
  }
  return await detect()
}

/** 调用 `openclaw gateway restart` 重启 gateway 进程。 */
export async function restartOpenclaw(): Promise<{ ok: boolean; error?: string }> {
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
 * @param args 包含 action 和 params 的调用参数
 */
export async function invokePlugin(args: InvokeArgs): Promise<InvokeResult> {
  const gateway = await detectGateway()
  if (!gateway.running || !gateway.gatewayPort) {
    return { ok: false, error: { message: "OpenClaw gateway 未运行" } }
  }
  if (!pluginServer) {
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
        Authorization: `Bearer ${pluginServer.info.token}`,
      },
      body: JSON.stringify(args),
    })
    clearTimeout(timer)
    return (await res.json()) as InvokeResult
  } catch (err) {
    return { ok: false, error: { message: (err as Error).message } }
  }
}
