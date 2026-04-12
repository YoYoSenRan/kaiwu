import fs from "node:fs/promises"
import XLSX from "xlsx"

/**
 * 解析 Excel 文件为纯文本。
 * 逐 sheet 逐行拼接，sheet 之间用双换行分隔。
 * @param filePath 文件绝对路径
 */
export async function parseExcel(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const parts: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    if (csv.trim()) parts.push(`## ${sheetName}\n${csv}`)
  }
  return parts.join("\n\n")
}
