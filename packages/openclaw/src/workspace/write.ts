import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { OPENCLAW_DIR, ALLOWED_WORKSPACE_FILES } from "../constants"

/**
 * 写入 workspace 文件内容
 */
export async function writeWorkspaceFile(agentId: string, filename: string, content: string): Promise<void> {
  if (!ALLOWED_WORKSPACE_FILES.has(filename)) {
    throw new Error(`不支持编辑文件: ${filename}`)
  }

  const filePath = join(OPENCLAW_DIR, `workspace-${agentId}`, filename)
  await writeFile(filePath, content, "utf-8")
}
