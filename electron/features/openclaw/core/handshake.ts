import path from "node:path"
import { promises as fs } from "node:fs"

/** handshake 文件名。固定在插件目录下，由 kaiwu 写入、插件启动时读取。 */
const HANDSHAKE_FILENAME = ".kaiwu-handshake.json"

/**
 * 写入 kaiwu 与插件通信所需的 handshake 文件。
 * handshake 的 token/port 构成 security 层的共享凭证。
 * @param params.extensionsDir OpenClaw 的 extensions 根目录
 * @param params.port kaiwu bridge server 端口
 * @param params.token 共享 token
 * @param params.pid kaiwu 主进程 pid（供诊断）
 */
export async function writeHandshake(params: { extensionsDir: string; port: number; token: string; pid: number }): Promise<string> {
  const target = path.join(params.extensionsDir, "kaiwu-bridge", HANDSHAKE_FILENAME)
  await fs.mkdir(path.dirname(target), { recursive: true })
  const payload = {
    port: params.port,
    token: params.token,
    pid: params.pid,
    startedAt: Date.now(),
  }
  await fs.writeFile(target, JSON.stringify(payload, null, 2), "utf-8")
  return target
}

/** 移除 handshake 文件（kaiwu 退出或卸载插件时调用）。 */
export async function removeHandshake(extensionsDir: string): Promise<void> {
  const target = path.join(extensionsDir, "kaiwu-bridge", HANDSHAKE_FILENAME)
  try {
    await fs.rm(target, { force: true })
  } catch {
    // ignore
  }
}
