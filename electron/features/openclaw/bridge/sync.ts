import { promises as fs } from "node:fs"
import path from "node:path"
import { scope } from "../../../infra/logger"
import { PLUGIN_SOURCE_DIR } from "../discovery/version"
import { bridgeDir, bridgePackageJson } from "./paths"

const log = scope("plugin:sync")

/** openclaw `tools.allow` 匹配按 pluginId 或 toolName(src/plugins/tools.ts)。加 pluginId 一把激活所有 kaiwu_* 工具。 */
const PLUGIN_ALLOW_ID = "kaiwu"

/** 同步到 OpenClaw extensions 目录时排除的文件/目录名。 */
const EXCLUDE_NAMES = new Set(["node_modules", ".git", ".DS_Store", "dist", ".kaiwu-handshake.json"])

/** `syncPlugin` 的成功结果。失败时直接抛错,不返回此结构。 */
export interface InstallResult {
  installed: true
  targetDir: string
  bytesWritten: number
  filesCopied: number
}

/**
 * 将 plugins/kaiwu 源码同步到 OpenClaw extensions 目录。
 * 策略:先拷贝到 <target>.tmp,原子替换到最终位置,保证目标始终是完整状态。
 */
export async function syncPlugin(extensionsDir: string): Promise<InstallResult> {
  await ensureDir(extensionsDir)
  const target = bridgeDir(extensionsDir)
  const staging = `${target}.tmp-${Date.now()}`

  const stats = { bytesWritten: 0, filesCopied: 0 }
  await copyDir(PLUGIN_SOURCE_DIR, staging, stats)
  await atomicReplace(staging, target)

  // 把 "kaiwu" 注入 openclaw.json 的 tools.allow,否则 agent 的工具 policy 会把 kaiwu_* 全过滤掉。
  // openclaw.json 和 extensionsDir 同级(extensionsDir=<configRoot>/extensions → configRoot=extensionsDir 的父目录)
  const configRoot = path.dirname(extensionsDir)
  await ensureKaiwuInToolsAllow(path.join(configRoot, "openclaw.json")).catch((err) => {
    log.warn(`failed to patch openclaw.json tools.allow: ${(err as Error).message}`)
  })

  return { installed: true, targetDir: target, bytesWritten: stats.bytesWritten, filesCopied: stats.filesCopied }
}

/**
 * 幂等地把 PLUGIN_ALLOW_ID 加到 openclaw.json 的 tools.allow 数组。
 * 文件不存在或格式异常时 warn 跳过,不阻塞同步。
 */
async function ensureKaiwuInToolsAllow(openclawJsonPath: string): Promise<void> {
  let raw: string
  try {
    raw = await fs.readFile(openclawJsonPath, "utf-8")
  } catch {
    log.info(`openclaw.json not found at ${openclawJsonPath}, skip allow patch`)
    return
  }
  const cfg = JSON.parse(raw) as { tools?: { allow?: unknown } }
  if (!cfg.tools || typeof cfg.tools !== "object") cfg.tools = {}
  if (!Array.isArray(cfg.tools.allow)) {
    log.info(`openclaw.json tools.allow not an array; skip patch`)
    return
  }
  const allow = cfg.tools.allow as string[]
  if (allow.includes(PLUGIN_ALLOW_ID)) return
  allow.push(PLUGIN_ALLOW_ID)
  const next = JSON.stringify(cfg, null, 2) + "\n"
  await fs.writeFile(openclawJsonPath, next, "utf-8")
  log.info(`added "${PLUGIN_ALLOW_ID}" to openclaw.json tools.allow`)
}

/** 卸载已同步的 kaiwu 插件。不存在时静默返回。 */
export async function removePluginFiles(extensionsDir: string): Promise<boolean> {
  try {
    await fs.rm(bridgeDir(extensionsDir), { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

/**
 * 检查 kaiwu 插件是否已同步到指定 extensions 目录,并读取其版本号。
 * 从 gateway 扫描职责中分离出来,单独作为 plugin 层的能力。
 */
export async function readBridge(extensionsDir: string): Promise<{ installed: boolean; version: string | null }> {
  try {
    const raw = await fs.readFile(bridgePackageJson(extensionsDir), "utf-8")
    const json = JSON.parse(raw) as { version?: string }
    return { installed: true, version: typeof json.version === "string" ? json.version : null }
  } catch {
    return { installed: false, version: null }
  }
}

// ---------- helpers ----------

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

async function copyDir(src: string, dst: string, stats: { bytesWritten: number; filesCopied: number }): Promise<void> {
  await ensureDir(dst)
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    if (EXCLUDE_NAMES.has(entry.name)) continue
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath, stats)
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, dstPath)
      const st = await fs.stat(dstPath)
      stats.bytesWritten += st.size
      stats.filesCopied += 1
    }
  }
}

/** 原子替换:先删旧目标,再把 staging 重命名过去。rename 失败时降级为拷贝。 */
async function atomicReplace(staging: string, target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true })
  try {
    await fs.rename(staging, target)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") {
      throw err
    }
    const stats = { bytesWritten: 0, filesCopied: 0 }
    await copyDir(staging, target, stats)
    await fs.rm(staging, { recursive: true, force: true })
  }
}
