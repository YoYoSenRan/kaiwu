import path from "node:path"
import { promises as fs } from "node:fs"

/** 不应在 workspace tab 中展示的顶层条目前缀。 */
const EXCLUDED_PREFIXES = [".openclaw", ".git", "avatar"]

/** 标准 bootstrap 文件顺序，展示时优先按此顺序排序。 */
const STANDARD_ORDER = ["SOUL.md", "IDENTITY.md", "USER.md", "HEARTBEAT.md", "TOOLS.md", "AGENTS.md", "BOOTSTRAP.md"]

/**
 * 列出 workspace 根目录下的文件（不递归）。
 * 过滤掉 .openclaw/ / .git/ / avatar/ 等内部目录，标准文件按固定顺序排在前面，
 * 其余按名字升序排在后。
 */
export async function listWorkspaceFiles(workspace: string): Promise<string[]> {
  const entries = await fs.readdir(workspace, { withFileTypes: true })
  const files = entries
    .filter((e) => e.isFile() && !EXCLUDED_PREFIXES.some((p) => e.name === p || e.name.startsWith(`${p}.`)))
    .map((e) => e.name)

  const standard = STANDARD_ORDER.filter((n) => files.includes(n))
  const rest = files.filter((n) => !STANDARD_ORDER.includes(n)).sort()
  return [...standard, ...rest]
}

/**
 * 读取 workspace 下指定文件的文本内容。
 * 带路径越界校验，防止 filename 包含 `..`。
 * @param workspace workspace 绝对路径
 * @param filename  workspace 下的相对文件名
 */
export async function readWorkspaceFile(workspace: string, filename: string): Promise<string> {
  const full = resolveSafe(workspace, filename)
  return fs.readFile(full, "utf-8")
}

/** 覆盖写入 workspace 下指定文件。 */
export async function writeWorkspaceFile(workspace: string, filename: string, content: string): Promise<void> {
  const full = resolveSafe(workspace, filename)
  await fs.writeFile(full, content, "utf-8")
}

/** 检查 workspace 目录当前是否存在于磁盘上。 */
export async function workspaceExists(workspace: string): Promise<boolean> {
  try {
    const stat = await fs.stat(workspace)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/** 解析目标路径并校验必须落在 workspace 下。 */
function resolveSafe(workspace: string, filename: string): string {
  const root = path.resolve(workspace)
  const abs = path.resolve(root, filename)
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(`路径越界: ${filename}`)
  }
  return abs
}
