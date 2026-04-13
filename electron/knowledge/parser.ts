import { parseMarkdown } from "./parsers/markdown"
import { parseTxt } from "./parsers/txt"
import { parsePdf } from "./parsers/pdf"
import { parseDocx } from "./parsers/docx"
import { parseExcel } from "./parsers/excel"

/** 支持的文档格式。 */
export type DocFormat = "md" | "pdf" | "docx" | "xlsx" | "txt"

const PARSERS: Record<DocFormat, (filePath: string) => Promise<string>> = {
  md: parseMarkdown,
  txt: parseTxt,
  pdf: parsePdf,
  docx: parseDocx,
  xlsx: parseExcel,
}

/**
 * 按格式分发到对应解析器，返回纯文本。
 * @param filePath 文件绝对路径
 * @param format 文档格式
 */
export async function parse(filePath: string, format: DocFormat): Promise<string> {
  const parser = PARSERS[format]
  if (!parser) throw new Error(`UNSUPPORTED_FORMAT: ${format}`)
  return parser(filePath)
}
