import fs from "node:fs/promises"

/**
 * 解析 Markdown 文件为纯文本。
 * @param filePath 文件绝对路径
 */
export async function parseMarkdown(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8")
}
