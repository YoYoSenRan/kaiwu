import type { ScanResult } from "../contracts/install"

import { promises as fs } from "node:fs"
import net from "node:net"
import path from "node:path"
import { findLiveLock, type LiveLockInfo } from "./lock"
import { inferDeployment, computeCapabilities } from "./deployment"
import { resolveActualPort } from "./port"
import { runCli } from "./cli"
import { configDir as resolveConfigDir } from "./paths"

/** TCP 扫描超时(ms)。 */
const PORT_PROBE_TIMEOUT_MS = 500
/** CLI 调用超时(ms),避免用户机器上 CLI 卡死影响 kaiwu 启动。 */
const CLI_TIMEOUT_MS = 3000
/** 缓存 TTL(ms)。3 秒内的重复调用直接返回缓存,减少文件系统和端口扫描开销。 */
const CACHE_TTL_MS = 3_000

/**
 * 多层扫描本机 OpenClaw gateway 的扫描器。
 *
 * 编排四层扫描:运行时(lock + port)→ 路径存在性 → CLI → 版本回填。
 * 任一层命中即继续后续字段补齐,未命中继续下一层。
 * 不涉及 kaiwu 插件状态——插件读取由 plugin/sync.ts 的 readBridge 负责。
 *
 * 实例级 TTL 缓存:同一 scanner 实例在 3s 内重复 scan() 返回缓存,
 * refresh() 跳过缓存(用户主动刷新)。
 */
export class GatewayScanner {
  private cache: { value: ScanResult | null; writtenAt: number } = { value: null, writtenAt: 0 }

  /** 扫描 gateway,走 3s TTL 缓存。 */
  async scan(): Promise<ScanResult> {
    if (this.cache.value && Date.now() - this.cache.writtenAt < CACHE_TTL_MS) {
      return this.cache.value
    }
    return this.runScan()
  }

  /** 跳过缓存强制重扫。 */
  async refresh(): Promise<ScanResult> {
    return this.runScan()
  }

  private async runScan(): Promise<ScanResult> {
    const dir = resolveConfigDir()
    const dirExists = await pathExists(dir)
    const liveLock = await findLiveLock()
    const base = await runtimeScan(dir, liveLock)

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
      base.version = await readInstalledVersion(dir)
    }

    base.deployment = inferDeployment(base, liveLock)
    base.capabilities = computeCapabilities(base.deployment)

    this.cache.value = base
    this.cache.writtenAt = Date.now()
    return base
  }
}

/**
 * 运行时扫描:构造初始 status 并依次跑 lock / port 两层强证据。
 * lock 文件最权威,port 扫描兜底并能拿到端口号。
 */
async function runtimeScan(dir: string, liveLock: LiveLockInfo | null): Promise<ScanResult> {
  const actualPort = resolveActualPort(dir)
  const base: ScanResult = {
    installed: false,
    running: false,
    version: null,
    configDir: dir,
    extensionsDir: path.join(dir, "extensions"),
    gatewayPort: null,
    detectedBy: null,
    deployment: "unknown",
    capabilities: computeCapabilities("unknown"),
  }

  if (liveLock) {
    base.installed = true
    base.running = true
    base.detectedBy = "lock"
  }

  if (await probePort(actualPort)) {
    base.installed = true
    base.running = true
    base.gatewayPort = actualPort
    if (!base.detectedBy) base.detectedBy = "port"
  }

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

/** 调用 `openclaw --version` 探 CLI。 */
async function probeCli(): Promise<{ found: boolean; version: string | null }> {
  const r = await runCli(["--version"], CLI_TIMEOUT_MS)
  if (r.code !== 0) return { found: false, version: null }
  const m = r.stdout.match(/\d+\.\d+\.\d+(?:[.-][\w.]+)?/)
  return { found: true, version: m?.[0] ?? null }
}

/** 从 configDir 读版本。OpenClaw 把版本写在 `openclaw.json` 的 `meta.lastTouchedVersion`。 */
async function readInstalledVersion(dir: string): Promise<string | null> {
  const candidates = [path.join(dir, "openclaw.json"), path.join(dir, "package.json")]
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
