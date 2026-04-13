import fs from "node:fs/promises"

/**
 * 解析纯文本文件。
 * @param filePath 文件绝对路径
 */
export async function parseTxt(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8")
}
