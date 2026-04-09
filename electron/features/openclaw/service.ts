import log from "../../core/logger"
import { isWin } from "../../core/env"
import { spawn } from "node:child_process"
import { detectOpenClaw } from "./detector"
import { openclawChannels } from "./channels"
import { checkCompatibility } from "./version"
import { getMainWindow } from "../../core/window"
import { startBridgeServer, type BridgeServer } from "./bridge-server"
import type { BridgeEvent, CompatResult, InvokeArgs, InvokeResult, OpenClawStatus } from "./types"
import { removeHandshake, syncBridgePlugin, uninstallBridgePlugin, writeHandshake } from "./installer"

/** 调用 `openclaw gateway restart` 的超时（ms）。 */
const RESTART_TIMEOUT_MS = 10_000
/** fetch 插件 HTTP 路由的超时（ms）。 */
const INVOKE_TIMEOUT_MS = 8_000

let bridgeServer: BridgeServer | null = null

/**
 * 启动本地 bridge WS server。kaiwu 启动时调用一次；幂等。
 * 启动后自动刷新 handshake 文件（如果插件已安装），避免插件用上一次 kaiwu 进程
 * 留下的 stale port/token 去连接一个已死的 WS。
 * 不会失败整个启动流程 —— 失败只记日志，让后续 detect 仍能跑。
 */
export async function startBridge(): Promise<BridgeServer | null> {
  if (bridgeServer) return bridgeServer
  try {
    bridgeServer = await startBridgeServer()
    bridgeServer.onEvent((event) => pushBridgeEvent(event))
    log.info(`[openclaw] bridge server up on 127.0.0.1:${bridgeServer.info.port}`)
    await refreshHandshakeIfInstalled()
    return bridgeServer
  } catch (err) {
    log.error(`[openclaw] bridge server failed to start: ${(err as Error).message}`)
    return null
  }
}

/**
 * 如果 kaiwu-bridge 插件已经被同步到 OpenClaw extensions 目录，
 * 用当前 bridge server 的 port/token 重写 handshake 文件。
 * 用户下次重启 OpenClaw gateway 时，插件会读到新 handshake 并连上来。
 */
async function refreshHandshakeIfInstalled(): Promise<void> {
  if (!bridgeServer) return
  const status = await detectOpenClaw()
  if (!status.extensionsDir || !status.bridgeInstalled) return
  try {
    await writeHandshake({
      extensionsDir: status.extensionsDir,
      port: bridgeServer.info.port,
      token: bridgeServer.info.token,
      pid: bridgeServer.info.pid,
    })
    log.info("[openclaw] handshake refreshed for existing install")
  } catch (err) {
    log.warn(`[openclaw] refresh handshake failed: ${(err as Error).message}`)
  }
}

/** 关闭 bridge server（kaiwu 退出时调用）。 */
export async function stopBridge(): Promise<void> {
  if (!bridgeServer) return
  await bridgeServer.close()
  bridgeServer = null
}

/** 探测 OpenClaw 并把结果推给 renderer。 */
export async function detect(): Promise<OpenClawStatus> {
  const status = await detectOpenClaw()
  pushStatusChanged(status)
  return status
}

/** 校验 kaiwu-bridge 对当前 OpenClaw 的兼容性。内部先跑一次探测拿版本。 */
export async function checkCompat(): Promise<CompatResult> {
  const status = await detectOpenClaw()
  return checkCompatibility(status.version)
}

/**
 * 同步插件源码到 OpenClaw extensions 目录并写入 handshake。
 * 先做兼容性校验，不兼容直接抛错，避免装一个跑不起来的插件。
 */
export async function installBridge(): Promise<OpenClawStatus> {
  const status = await detectOpenClaw()
  if (!status.installed || !status.extensionsDir) {
    throw new Error("未检测到 OpenClaw 安装（configDir 不存在），请先安装 OpenClaw")
  }
  const compat = checkCompatibility(status.version)
  if (!compat.compatible) {
    throw new Error(compat.reason ?? "kaiwu-bridge 与当前 OpenClaw 版本不兼容")
  }

  await syncBridgePlugin(status.extensionsDir)

  if (bridgeServer) {
    await writeHandshake({
      extensionsDir: status.extensionsDir,
      port: bridgeServer.info.port,
      token: bridgeServer.info.token,
      pid: bridgeServer.info.pid,
    })
  } else {
    log.warn("[openclaw] bridge server not running when installing; plugin will be idle")
  }

  return await detect()
}

/** 卸载已同步的插件和 handshake 文件。 */
export async function uninstallBridge(): Promise<OpenClawStatus> {
  const status = await detectOpenClaw()
  if (status.extensionsDir) {
    await removeHandshake(status.extensionsDir)
    await uninstallBridgePlugin(status.extensionsDir)
  }
  return await detect()
}

/**
 * 调用 `openclaw gateway restart` 重启 gateway 进程。
 * 依赖系统上存在 openclaw CLI；不在 PATH 里会失败。
 */
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
 * 通过 OpenClaw gateway 调用 kaiwu-bridge 插件的 /kaiwu/invoke 路由。
 * kaiwu → OpenClaw → 插件 的入站通道。
 */
export async function invokePlugin(args: InvokeArgs): Promise<InvokeResult> {
  const status = await detectOpenClaw()
  if (!status.running || !status.gatewayPort) {
    return { ok: false, error: { message: "OpenClaw gateway 未运行" } }
  }
  if (!bridgeServer) {
    return { ok: false, error: { message: "bridge server 未启动，无法鉴权" } }
  }
  const url = `http://127.0.0.1:${status.gatewayPort}/kaiwu/invoke`
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), INVOKE_TIMEOUT_MS)
    const res = await fetch(url, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bridgeServer.info.token}`,
      },
      body: JSON.stringify(args),
    })
    clearTimeout(timer)
    const body = (await res.json()) as InvokeResult
    return body
  } catch (err) {
    return { ok: false, error: { message: (err as Error).message } }
  }
}

// ---------- renderer push helpers ----------

function pushBridgeEvent(event: BridgeEvent): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.bridgeEvent, event)
}

function pushStatusChanged(status: OpenClawStatus): void {
  const win = getMainWindow()
  if (!win) return
  win.webContents.send(openclawChannels.statusChanged, status)
}
