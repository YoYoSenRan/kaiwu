import fs from "node:fs/promises"
import mammoth from "mammoth"

/**
 * 解析 DOCX 文件为纯文本。
 * @param filePath 文件绝对路径
 */
export async function parseDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
