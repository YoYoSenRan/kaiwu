import { promises as fs } from "node:fs"
import path from "node:path"
import { PLUGIN_SOURCE_DIR } from "./compat"

/** 同步到 OpenClaw extensions 目录时排除的文件/目录名。 */
const EXCLUDE_NAMES = new Set(["node_modules", ".git", ".DS_Store", "dist", ".kaiwu-handshake.json"])

export interface InstallResult {
  installed: true
  targetDir: string
  bytesWritten: number
  filesCopied: number
}

/**
 * 将 plugins/kaiwu 源码同步到 OpenClaw extensions 目录。
 * 策略：先拷贝到 <target>.tmp，原子替换到最终位置，保证目标始终是完整状态。
 * @param extensionsDir OpenClaw 的 extensions 根目录
 */
export async function syncBridgePlugin(extensionsDir: string): Promise<InstallResult> {
  await ensureDir(extensionsDir)
  const target = path.join(extensionsDir, "kaiwu")
  const staging = `${target}.tmp-${Date.now()}`

  const stats = { bytesWritten: 0, filesCopied: 0 }
  await copyDir(PLUGIN_SOURCE_DIR, staging, stats)
  await atomicReplace(staging, target)

  return { installed: true, targetDir: target, bytesWritten: stats.bytesWritten, filesCopied: stats.filesCopied }
}

/**
 * 卸载已同步的 kaiwu 插件。不存在时静默返回。
 * @param extensionsDir OpenClaw 的 extensions 根目录
 */
export async function uninstallBridgePlugin(extensionsDir: string): Promise<boolean> {
  const target = path.join(extensionsDir, "kaiwu")
  try {
    await fs.rm(target, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

/**
 * 检查 kaiwu 插件是否已同步到指定 extensions 目录，并读取其版本号。
 * 从 gateway 探测职责中分离出来，单独作为 plugin 层的能力。
 * @param extensionsDir OpenClaw 的 extensions 根目录
 */
export async function detectPluginInstall(extensionsDir: string): Promise<{ installed: boolean; version: string | null }> {
  const pkgPath = path.join(extensionsDir, "kaiwu", "package.json")
  try {
    const raw = await fs.readFile(pkgPath, "utf-8")
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

/** 原子替换：先删旧目标，再把 staging 重命名过去。rename 失败时降级为拷贝。 */
async function atomicReplace(staging: string, target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true })
  try {
    await fs.rename(staging, target)
  } catch (err) {
    // 跨设备 rename 会失败（EXDEV），降级为递归拷贝 + 删 staging
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") {
      throw err
    }
    const stats = { bytesWritten: 0, filesCopied: 0 }
    await copyDir(staging, target, stats)
    await fs.rm(staging, { recursive: true, force: true })
  }
}
