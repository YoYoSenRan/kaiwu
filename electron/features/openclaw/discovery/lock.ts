import { execFileSync } from "node:child_process"
import fsSync from "node:fs"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

/**
 * gateway lock 文件内容，镜像 openclaw/src/infra/gateway-lock.ts 的 LockPayload。
 * 字段可能随 OpenClaw 版本增加，此处只声明我们实际读取的字段。
 */
export interface GatewayLockPayload {
  pid: number
  /** ISO 8601 字符串，由 OpenClaw 写入。 */
  createdAt: string
  /** OpenClaw 启动时使用的 config 文件路径。 */
  configPath: string
  /** 可选，Linux 下 proc 读到的进程启动时间（jiffies）。 */
  startTime?: number
}

/** 侦测到的存活 lock 结果。 */
export interface LiveLockInfo {
  pid: number
  configPath: string
  createdAt: string
  lockPath: string
  /** 进程命令行是否匹配 OpenClaw gateway 特征。false 时可能是 PID 回收。 */
  isGateway: boolean
}

/**
 * 扫描 OpenClaw 的 gateway lock 目录，返回第一个指向存活进程的 lock。
 * 找不到任何 lock、或所有 lock 的 pid 都已死，返回 null。
 * 扫描而不是定位具体文件的原因：lock 文件名是 `gateway.<configHash>.lock`，
 * 其中 hash 依赖于 OpenClaw 当前 config 路径——kaiwu 无法在不知道 config 路径的前提下复原这个哈希。
 */
export async function findLiveLock(): Promise<LiveLockInfo | null> {
  const lockDir = resolveLockDir()
  const entries = await listLockFiles(lockDir)
  for (const entry of entries) {
    const payload = await readLockPayload(entry)
    if (!payload) continue
    if (!isPidAlive(payload.pid)) continue
    const args = readProcessCmdline(payload.pid)
    return {
      pid: payload.pid,
      configPath: payload.configPath,
      createdAt: payload.createdAt,
      lockPath: entry,
      isGateway: args ? isGatewayProcess(args) : false,
    }
  }
  return null
}

/**
 * 解析 OpenClaw 的 lock 目录路径。
 * 镜像 openclaw/src/config/paths.ts 的 resolveGatewayLockDir：
 * `$TMPDIR/openclaw-<uid>`（Unix，uid 来自 process.getuid），或 `$TMPDIR/openclaw`（Windows）。
 */
export function resolveLockDir(): string {
  const base = os.tmpdir()
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined
  const suffix = uid != null ? `openclaw-${uid}` : "openclaw"
  return path.join(base, suffix)
}

async function listLockFiles(lockDir: string): Promise<string[]> {
  try {
    const names = await fs.readdir(lockDir)
    return names.filter((n) => n.startsWith("gateway.") && n.endsWith(".lock")).map((n) => path.join(lockDir, n))
  } catch (err) {
    // 目录不存在 = OpenClaw 从未写过 lock，属于正常无命中
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
    return []
  }
}

async function readLockPayload(lockPath: string): Promise<GatewayLockPayload | null> {
  try {
    const raw = await fs.readFile(lockPath, "utf-8")
    const parsed: unknown = JSON.parse(raw)
    if (!isPayload(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function isPayload(v: unknown): v is GatewayLockPayload {
  if (typeof v !== "object" || v === null) return false
  const p = v as Record<string, unknown>
  return typeof p.pid === "number" && typeof p.createdAt === "string" && typeof p.configPath === "string"
}

/**
 * 跨平台 pid 存活检查。
 * `process.kill(pid, 0)` 不会真的杀进程——信号 0 只做权限/存活检查：
 * - 进程存在且当前用户有权访问 → 返回 true
 * - 进程不存在（ESRCH）→ 返回 false
 * - 存在但无权访问（EPERM）→ 仍然算存活（对方进程确实在）
 */
function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    return code === "EPERM"
  }
}

const CMDLINE_TIMEOUT_MS = 1000

function readLinuxCmdline(pid: number): string[] | null {
  try {
    const raw = fsSync.readFileSync(`/proc/${pid}/cmdline`, "utf8")
    return raw.split("\0").filter(Boolean)
  } catch {
    return null
  }
}

function readWindowsCmdline(pid: number): string[] | null {
  try {
    const buf = execFileSync("wmic", ["process", "where", `processid=${pid}`, "get", "CommandLine", "/value"], {
      timeout: CMDLINE_TIMEOUT_MS,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    }) as Buffer
    const raw = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe ? buf.toString("utf16le") : buf.toString("utf8")
    const match = raw.match(/CommandLine=(.+)/)
    if (!match) return null
    return match[1].trim().split(/\s+/).filter(Boolean)
  } catch {
    return null
  }
}

function readDarwinCmdline(pid: number): string[] | null {
  try {
    const raw = execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
      timeout: CMDLINE_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "ignore"],
    })
    const line = raw.trim()
    if (!line) return null
    return line.split(/\s+/).filter(Boolean)
  } catch {
    return null
  }
}

/** 跨平台读取进程命令行参数。 */
export function readProcessCmdline(pid: number): string[] | null {
  const platform = process.platform
  if (platform === "linux") return readLinuxCmdline(pid)
  if (platform === "win32") return readWindowsCmdline(pid)
  if (platform === "darwin") return readDarwinCmdline(pid)
  return null
}

/** 判断命令行参数是否匹配 OpenClaw / Node 运行时特征。 */
export function isGatewayProcess(args: string[]): boolean {
  if (args.length === 0) return false
  const cmdline = args.join(" ").toLowerCase()
  return /openclaw|clawdbot|node/.test(cmdline)
}
