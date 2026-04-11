import path from "node:path"
import { promises as fs } from "node:fs"
import type { Dirent } from "node:fs"

/** 允许的头像文件扩展名（小写不带点）。超出这个集合会拒绝。 */
const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"])

/**
 * 把用户选择的本地头像文件复制到 `<workspace>/avatar/avatar.<ext>`。
 * 扩展名保留源文件类型，文件名强制重命名为 `avatar`。
 * 复制前清空 avatar 目录下所有 avatar.* 旧文件，确保只留一份。
 *
 * @param workspace agent workspace 绝对路径
 * @param sourcePath 用户选择的源文件绝对路径
 * @returns workspace 相对路径（posix 风格），形如 `avatar/avatar.png`
 */
export async function saveUploadedAvatar(workspace: string, sourcePath: string): Promise<string> {
  const ext = path.extname(sourcePath).slice(1).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`不支持的头像格式: ${ext || "未知"}`)
  }

  const avatarDir = path.join(workspace, "avatar")
  await fs.mkdir(avatarDir, { recursive: true })
  await cleanupOldAvatars(avatarDir)

  const targetName = `avatar.${ext}`
  await fs.copyFile(sourcePath, path.join(avatarDir, targetName))

  // openclaw 的 workspace 相对路径 resolve 接受 posix 风格，统一用正斜杠
  return path.posix.join("avatar", targetName)
}

/** 删除目录下所有 `avatar.*` 旧文件，避免切换格式时残留。 */
async function cleanupOldAvatars(avatarDir: string): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await fs.readdir(avatarDir, { withFileTypes: true })
  } catch {
    return
  }
  await Promise.all(
    entries.filter((e) => e.isFile() && e.name.startsWith("avatar.")).map((e) => fs.unlink(path.join(avatarDir, e.name))),
  )
}
