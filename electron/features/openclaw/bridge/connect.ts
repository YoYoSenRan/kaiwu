import { promises as fs } from "node:fs"

import { connectFilePath, bridgeDir } from "./paths"

/**
 * 写 connect 文件:告诉 OpenClaw 里的 kaiwu 插件 "来哪儿找 kaiwu、拿什么 token"。
 * port/token 构成插件侧 security 层的共享凭证。
 */
export async function writeConnectFile(params: { extensionsDir: string; port: number; token: string; pid: number }): Promise<string> {
  const target = connectFilePath(params.extensionsDir)
  await fs.mkdir(bridgeDir(params.extensionsDir), { recursive: true })
  const payload = { port: params.port, token: params.token, pid: params.pid, startedAt: Date.now() }
  await fs.writeFile(target, JSON.stringify(payload, null, 2), "utf-8")
  return target
}

/** 移除 connect 文件(kaiwu 退出或卸载插件时调用)。 */
export async function removeConnectFile(extensionsDir: string): Promise<void> {
  try {
    await fs.rm(connectFilePath(extensionsDir), { force: true })
  } catch {
    // ignore
  }
}
