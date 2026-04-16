import type { OpenClawStatus } from "../types"

import { spawn } from "node:child_process"
import fsSync from "node:fs"
import { promises as fs } from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { isWin } from "../../../infra/env"
import { findLiveLock } from "./lock"

/** OpenClaw gateway 默认端口，来自 openclaw/src/config/paths.ts。 */
export const DEFAULT_GATEWAY_PORT = 18789
/** TCP 探测超时（ms）。 */
const PORT_PROBE_TIMEOUT_MS = 500
/** CLI 调用超时（ms），避免用户机器上 CLI 卡死影响 kaiwu 启动。 */
const CLI_TIMEOUT_MS = 3000
/** `.openclaw` 目录在 Windows 上位于 %APPDATA%，其他平台位于 $HOME。 */
const OPENCLAW_DIRNAME = ".openclaw"
/** OpenClaw 旧版 state 目录名（rebrand 前）。 */
const LEGACY_OPENCLAW_DIRNAME = ".clawdbot"

/** gateway 探测结果：不包含 kaiwu 插件相关字段，由 plugin 层单独补齐。 */
export type GatewayStatus = Omit<OpenClawStatus, "bridgeInstalled" | "installedBridgeVersion">

/** 缓存 TTL（ms）。3 秒内的重复调用直接返回缓存，减少文件系统和端口探测开销。 */
const CACHE_TTL_MS = 3_000

let cachedResult: GatewayStatus | null = null
let cachedAt = 0

/**
 * 多层侦测本机 OpenClaw gateway。
 * 编排四层探测：运行时（lock + port）→ 路径存在性 → CLI → 版本回填。
 * 任一层命中即继续后续字段补齐，未命中继续下一层。
 * 不涉及 kaiwu 插件状态——插件检测由 plugin.ts 的 detectPluginInstall 负责。
 *
 * @param skipCache 强制跳过缓存（用户主动刷新时传 true）
 */
export async function detectGateway(skipCache = false): Promise<GatewayStatus> {
  if (!skipCache && cachedResult && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResult
  }
  const configDir = resolveConfigDir()
  const dirExists = await pathExists(configDir)
  const base = await runtimeProbe(configDir)

  if (!base.installed && dirExists) {
    base.installed = true
    base.detectedBy = "path"
  }
  if (!base.installed) {
    const cli = await probeCli()
    if (cli.found) {
      base.installed = true
      base.detectedBy = "cli"
      base.version = cli.version
    }
  }
  if (base.installed && !base.version) {
    base.version = await readInstalledVersion(configDir)
  }
  cachedResult = base
  cachedAt = Date.now()
  return base
}

/**
 * 运行时探测：构造初始 status 并依次跑 lock / port 两层强证据。
 * lock 文件最权威（有存活 pid 能确定是 OpenClaw 进程），port 探测兜底并能拿到端口号。
 */
async function runtimeProbe(configDir: string): Promise<GatewayStatus> {
  const base: GatewayStatus = {
    installed: false,
    running: false,
    version: null,
    configDir,
    extensionsDir: path.join(configDir, "extensions"),
    gatewayPort: null,
    detectedBy: null,
  }

  const liveLock = await findLiveLock()
  if (liveLock) {
    base.installed = true
    base.running = true
    base.detectedBy = "lock"
  }

  const portAlive = await probePort(DEFAULT_GATEWAY_PORT)
  if (portAlive) {
    base.installed = true
    base.running = true
    base.gatewayPort = DEFAULT_GATEWAY_PORT
    if (!base.detectedBy) base.detectedBy = "port"
  }

  return base
}

/** 拿配置根目录，跨平台实现。镜像 openclaw/src/config/paths.ts 的 resolveStateDir 逻辑。 */
function resolveConfigDir(): string {
  const stateDirOverride = process.env.OPENCLAW_STATE_DIR?.trim()
  if (stateDirOverride) return stateDirOverride
  const homeOverride = process.env.OPENCLAW_HOME?.trim()
  if (homeOverride) return homeOverride

  if (isWin) {
    const appData = process.env.APPDATA
    const base = appData ? path.join(appData, OPENCLAW_DIRNAME) : path.join(os.homedir(), "AppData", "Roaming", OPENCLAW_DIRNAME)
    if (fsSync.existsSync(base)) return base
    const legacy = appData ? path.join(appData, LEGACY_OPENCLAW_DIRNAME) : path.join(os.homedir(), "AppData", "Roaming", LEGACY_OPENCLAW_DIRNAME)
    if (fsSync.existsSync(legacy)) return legacy
    return base
  }

  const base = path.join(os.homedir(), OPENCLAW_DIRNAME)
  if (fsSync.existsSync(base)) return base
  const legacy = path.join(os.homedir(), LEGACY_OPENCLAW_DIRNAME)
  if (fsSync.existsSync(legacy)) return legacy
  return base
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
