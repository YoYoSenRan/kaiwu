import path from "node:path"
import fs from "node:fs/promises"
import { app } from "electron"

/** 知识库文件缓存根目录。 */
function getCacheRoot(): string {
  return path.join(app.getPath("userData"), "knowledge-files")
}

/**
 * 获取文档的缓存文件路径。
 * @param kbId 知识库 id
 * @param docId 文档 id
 * @param format 文件格式（扩展名）
 */
export function getCachePath(kbId: string, docId: string, format: string): string {
  return path.join(getCacheRoot(), kbId, `${docId}.${format}`)
}

/**
 * 将源文件复制到缓存目录，确保目录存在。
 * @param sourcePath 用户选择的原始文件路径
 * @param kbId 知识库 id
 * @param docId 文档 id
 * @param format 文件格式
 */
export async function copyToCache(sourcePath: string, kbId: string, docId: string, format: string): Promise<void> {
  const dest = getCachePath(kbId, docId, format)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.copyFile(sourcePath, dest)
}

/**
 * 删除单个文档的缓存文件，文件不存在时静默忽略。
 * @param kbId 知识库 id
 * @param docId 文档 id
 * @param format 文件格式
 */
export async function removeCacheFile(kbId: string, docId: string, format: string): Promise<void> {
  await fs.rm(getCachePath(kbId, docId, format), { force: true })
}

/**
 * 删除整个知识库的缓存目录。
 * @param kbId 知识库 id
 */
export async function removeCacheDir(kbId: string): Promise<void> {
  await fs.rm(path.join(getCacheRoot(), kbId), { recursive: true, force: true })
}
