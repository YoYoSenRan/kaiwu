import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { OPENCLAW_DIR, ALLOWED_WORKSPACE_FILES } from "../constants"

/**
 * 读取 workspace 文件内容
 * @returns 文件内容，文件不存在时返回 null
 */
export async function readWorkspaceFile(agentId: string, filename: string): Promise<string | null> {
  if (!ALLOWED_WORKSPACE_FILES.has(filename)) {
    throw new Error(`不支持读取文件: ${filename}`)
  }

  const filePath = join(OPENCLAW_DIR, `workspace-${agentId}`, filename)

  try {
    return await readFile(filePath, "utf-8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw err
  }
}
