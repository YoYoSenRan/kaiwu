import { readdir, access } from "node:fs/promises"
import { join } from "node:path"
import { OPENCLAW_DIR, ALLOWED_WORKSPACE_FILES } from "../constants"

/**
 * 列出 workspace 目录下实际存在的官方支持文件
 */
export async function listWorkspaceFiles(agentId: string): Promise<string[]> {
  const workspaceDir = join(OPENCLAW_DIR, `workspace-${agentId}`)

  try {
    const entries = await readdir(workspaceDir)
    return entries.filter((name) => ALLOWED_WORKSPACE_FILES.has(name))
  } catch {
    return []
  }
}

/**
 * 检查 workspace 目录是否存在
 */
export async function workspaceExists(agentId: string): Promise<boolean> {
  try {
    await access(join(OPENCLAW_DIR, `workspace-${agentId}`))
    return true
  } catch {
    return false
  }
}
