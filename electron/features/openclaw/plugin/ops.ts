import type { EmitEvent, CompatResult, InvokeArgs, InvokeResult, OpenClawStatus } from "../types"
import type { PluginServer } from "./transport"
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
/** fetch 插件 HTTP 路由的超时(ms)。 */
const INVOKE_TIMEOUT_MS = 8_000

/** 探测 OpenClaw gateway + kaiwu 插件安装状态, 并推送给 renderer。用户主动触发, 跳过缓存。 */
export async function detect(emitEvent: EmitEvent): Promise<OpenClawStatus> {
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
export async function checkCompatibility(): Promise<CompatResult> {
  const gateway = await detectGateway()
  return computeCompatibility(gateway.version)
}

/**
 * 同步插件源码到 OpenClaw extensions 目录并写入 handshake。
 * 先做兼容性校验,不兼容直接抛错。
 */
export async function install(server: PluginServer | null, emitEvent: EmitEvent): Promise<OpenClawStatus> {
  const gateway = await detectGateway()
  if (!gateway.installed || !gateway.extensionsDir) {
    throw new Error("未检测到 OpenClaw 安装(configDir 不存在),请先安装 OpenClaw")
  }
  const compat = computeCompatibility(gateway.version)
  if (!compat.compatible) {
    throw new Error(compat.reason ?? "kaiwu 与当前 OpenClaw 版本不兼容")
  }
  await syncPlugin(gateway.extensionsDir)
  if (server) {
    await writeHandshake({
      extensionsDir: gateway.extensionsDir,
      port: server.info.port,
      token: server.info.token,
      pid: server.info.pid,
    })
  } else {
    log.warn("安装插件时桥接服务未运行, 插件将处于空闲状态")
  }
  return await detect(emitEvent)
}

/** 卸载已同步的插件和 handshake 文件。 */
export async function uninstall(emitEvent: EmitEvent): Promise<OpenClawStatus> {
  const gateway = await detectGateway()
  if (gateway.extensionsDir) {
    await removeHandshake(gateway.extensionsDir)
    await removePluginFiles(gateway.extensionsDir)
  }
  return await detect(emitEvent)
}

/** 调用 `openclaw gateway restart` 重启 gateway 进程。 */
export async function restart(): Promise<{ ok: boolean; error?: string }> {
  return await new Promise((resolve) => {
    // Windows 上 spawn 默认不会解析 .cmd/.bat, 用 shell 模式确保能找到 openclaw 入口
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

/**
 * 通过 OpenClaw gateway 调用 kaiwu 插件的 HTTP 路由。
 * kaiwu → OpenClaw → 插件 的入站通道。
 */
export async function invoke(server: PluginServer | null, args: InvokeArgs): Promise<InvokeResult> {
  const gateway = await detectGateway()
  if (!gateway.running || !gateway.gatewayPort) {
    return { ok: false, error: { message: "OpenClaw gateway 未运行" } }
  }
  if (!server) {
    return { ok: false, error: { message: "bridge server 未启动, 无法鉴权" } }
  }
  const url = `http://127.0.0.1:${gateway.gatewayPort}/kaiwu/invoke`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${server.info.token}`,
        },
        body: JSON.stringify(args),
      })
      return (await res.json()) as InvokeResult
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    return { ok: false, error: { message: (err as Error).message } }
  }
}
