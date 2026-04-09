import os from "node:os"
import net from "node:net"
import path from "node:path"
import { findLiveLock } from "./lock"
import { promises as fs } from "node:fs"
import { isWin } from "../../../core/env"
import { spawn } from "node:child_process"
import type { OpenClawStatus } from "../types"

/** OpenClaw gateway 默认端口，来自 openclaw/src/config/paths.ts。 */
export const DEFAULT_GATEWAY_PORT = 18789
/** TCP 探测超时（ms）。 */
const PORT_PROBE_TIMEOUT_MS = 500
/** CLI 调用超时（ms），避免用户机器上 CLI 卡死影响 kaiwu 启动。 */
const CLI_TIMEOUT_MS = 3000
/** `.openclaw` 目录在 Windows 上位于 %APPDATA%，其他平台位于 $HOME。 */
const OPENCLAW_DIRNAME = ".openclaw"

/** gateway 探测结果：不包含 kaiwu-bridge 插件相关字段，由 plugin 层单独补齐。 */
export type GatewayStatus = Omit<OpenClawStatus, "bridgeInstalled" | "installedBridgeVersion">

/**
 * 多层侦测本机 OpenClaw gateway。
 * 任一层命中即返回，未命中继续下一层。所有字段都尽可能填写（已安装但未运行的情形也有价值）。
 * 不涉及 kaiwu-bridge 插件状态——插件检测由 plugin.ts 的 detectPluginInstall 负责。
 */
export async function detectGateway(): Promise<GatewayStatus> {
  const configDir = resolveConfigDir()
  const extensionsDir = path.join(configDir, "extensions")
  const base: GatewayStatus = {
    installed: false,
    running: false,
    version: null,
    configDir,
    extensionsDir,
    gatewayPort: null,
    detectedBy: null,
  }

  // 先看配置目录在不在，任何一层探测成功都至少说明"装过"
  const dirExists = await pathExists(configDir)

  // 1. lock 文件（最权威：有存活 pid 就能确定是 OpenClaw 本身在跑，不会被占同端口的其他进程误伤）
  const liveLock = await findLiveLock()
  if (liveLock) {
    base.installed = true
    base.running = true
    base.detectedBy = "lock"
  }

  // 2. 端口探测（拿到具体 gatewayPort；未命中 lock 时也能独立证明运行中）
  const portAlive = await probePort(DEFAULT_GATEWAY_PORT)
  if (portAlive) {
    base.installed = true
    base.running = true
    base.gatewayPort = DEFAULT_GATEWAY_PORT
    if (!base.detectedBy) base.detectedBy = "port"
  }

  // 3. 配置目录存在（证明至少装过）
  if (!base.installed && dirExists) {
    base.installed = true
    base.detectedBy = "path"
  }

  // 4. CLI 可用性（兜底，能拿到版本）
  if (!base.installed) {
    const cli = await probeCli()
    if (cli.found) {
      base.installed = true
      base.detectedBy = "cli"
      base.version = cli.version
    }
  }

  // 版本拿取：优先 CLI（若还没拿），否则读 configDir/package.json 退路
  if (base.installed && !base.version) {
    base.version = await readInstalledVersion(configDir)
  }

  return base
}

/** 拿配置根目录，跨平台实现。 */
function resolveConfigDir(): string {
  const override = process.env.OPENCLAW_HOME
  if (override && override.length > 0) return override
  if (isWin) {
    const appData = process.env.APPDATA
    if (appData) return path.join(appData, OPENCLAW_DIRNAME)
    return path.join(os.homedir(), "AppData", "Roaming", OPENCLAW_DIRNAME)
  }
  return path.join(os.homedir(), OPENCLAW_DIRNAME)
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const done = (ok: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(PORT_PROBE_TIMEOUT_MS)
    socket.once("connect", () => done(true))
    socket.once("timeout", () => done(false))
    socket.once("error", () => done(false))
    socket.connect(port, "127.0.0.1")
  })
}

interface CliResult {
  found: boolean
  version: string | null
}

/** 调用 `openclaw --version` 探测 CLI。 */
function probeCli(): Promise<CliResult> {
  return new Promise((resolve) => {
    let settled = false
    const done = (r: CliResult) => {
      if (settled) return
      settled = true
      resolve(r)
    }
    const timer = setTimeout(() => done({ found: false, version: null }), CLI_TIMEOUT_MS)
    try {
      // Windows 上 spawn 默认不会解析 .cmd/.bat，用 shell 模式兼容 openclaw.cmd 包装脚本
      const child = spawn("openclaw", ["--version"], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: isWin,
      })
      let stdout = ""
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf-8")))
      child.once("error", () => {
        clearTimeout(timer)
        done({ found: false, version: null })
      })
      child.once("exit", (code) => {
        clearTimeout(timer)
        if (code === 0) {
          const m = stdout.match(/\d+\.\d+\.\d+(?:[.-][\w.]+)?/)
          done({ found: true, version: m?.[0] ?? null })
        } else {
          done({ found: false, version: null })
        }
      })
    } catch {
      clearTimeout(timer)
      done({ found: false, version: null })
    }
  })
}

/** 从 configDir 读版本。OpenClaw 把版本写在 `openclaw.json` 的 `meta.lastTouchedVersion`。 */
async function readInstalledVersion(configDir: string): Promise<string | null> {
  const candidates = [path.join(configDir, "openclaw.json"), path.join(configDir, "package.json")]
  type VersionShape = { version?: string; gateway?: { version?: string }; meta?: { lastTouchedVersion?: string } }
  for (const p of candidates) {
    try {
      const json = JSON.parse(await fs.readFile(p, "utf-8")) as VersionShape
      const v = json.version ?? json.gateway?.version ?? json.meta?.lastTouchedVersion
      if (typeof v === "string") return v
    } catch {
      // continue
    }
  }
  return null
}
