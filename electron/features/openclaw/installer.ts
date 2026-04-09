import path from "node:path"
import { promises as fs } from "node:fs"
import { PLUGIN_SOURCE_DIR } from "./version"

/** 同步到 OpenClaw extensions 目录时排除的文件/目录名。 */
const EXCLUDE_NAMES = new Set(["node_modules", ".git", ".DS_Store", "dist", ".kaiwu-handshake.json"])

export interface InstallResult {
  installed: true
  targetDir: string
  bytesWritten: number
  filesCopied: number
}

/**
 * 将 plugins/kaiwu-bridge 源码同步到 OpenClaw extensions 目录。
 * 策略：先拷贝到 <target>.tmp，原子替换到最终位置，保证目标始终是完整状态。
 * @param extensionsDir OpenClaw 的 extensions 根目录
 */
export async function syncBridgePlugin(extensionsDir: string): Promise<InstallResult> {
  await ensureDir(extensionsDir)
  const target = path.join(extensionsDir, "kaiwu-bridge")
  const staging = `${target}.tmp-${Date.now()}`

  const stats = { bytesWritten: 0, filesCopied: 0 }
  await copyDir(PLUGIN_SOURCE_DIR, staging, stats)
  await atomicReplace(staging, target)

  return { installed: true, targetDir: target, bytesWritten: stats.bytesWritten, filesCopied: stats.filesCopied }
}

/**
 * 卸载已同步的 kaiwu-bridge 插件。不存在时静默返回。
 * @param extensionsDir OpenClaw 的 extensions 根目录
 */
export async function uninstallBridgePlugin(extensionsDir: string): Promise<boolean> {
  const target = path.join(extensionsDir, "kaiwu-bridge")
  try {
    await fs.rm(target, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

/**
 * 写入 kaiwu 与插件通信所需的 handshake 文件。
 * @param extensionsDir OpenClaw 的 extensions 根目录
 * @param port kaiwu bridge server 端口
 * @param token 共享 token
 */
export async function writeHandshake(params: { extensionsDir: string; port: number; token: string; pid: number }): Promise<string> {
  const target = path.join(params.extensionsDir, "kaiwu-bridge", ".kaiwu-handshake.json")
  await ensureDir(path.dirname(target))
  const payload = {
    port: params.port,
    token: params.token,
    pid: params.pid,
    startedAt: Date.now(),
  }
  await fs.writeFile(target, JSON.stringify(payload, null, 2), "utf-8")
  return target
}

/** 移除 handshake 文件（kaiwu 退出时调用）。 */
export async function removeHandshake(extensionsDir: string): Promise<void> {
  const target = path.join(extensionsDir, "kaiwu-bridge", ".kaiwu-handshake.json")
  try {
    await fs.rm(target, { force: true })
  } catch {
    // ignore
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
