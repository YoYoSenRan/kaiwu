/** 所有可能的 content block 类型。新增类型在此扩展即可。 */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string | unknown; is_error?: boolean }
  | { type: "thinking"; thinking: string }
  | { type: "image"; source: { type: string; data?: string; media_type?: string; url?: string } }
  | { type: "audio"; source: { type: string; data?: string; media_type?: string } }

/**
 * 解析 chat_messages.content 字段。
 * user 消息是纯字符串，agent 消息是 JSON 数组。
 * 旧数据（纯文本 agent 消息）也能兼容——当作 string 返回。
 * @param content DB 中的 content 字段
 */
export function parseContent(content: string): string | ContentBlock[] {
  if (!content.startsWith("[")) return content
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed as ContentBlock[]
  } catch {
    // JSON 解析失败，当纯文本处理
  }
  return content
}

/**
 * 从原始 content 中提取纯文本。用于搜索、摘要、content_hash 等场景。
 * @param content DB 中的 content 字段，或远程消息的 content（string | unknown[]）
 */
export function extractPlainText(content: unknown): string {
  if (typeof content === "string") {
    const parsed = parseContent(content)
    if (typeof parsed === "string") return parsed
    return parsed
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
  }
  if (!Array.isArray(content)) return ""
  return (content as Array<{ type?: string; text?: string }>)
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("")
}
