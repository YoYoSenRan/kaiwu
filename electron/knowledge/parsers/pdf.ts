import fs from "node:fs/promises"
import { PDFParse } from "pdf-parse"

/**
 * 解析 PDF 文件为纯文本。
 * @param filePath 文件绝对路径
 */
export async function parsePdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}
