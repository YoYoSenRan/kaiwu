/**
 * 从 agent 回复文本里抽取 ```card JSON``` 代码块,返回 (去 card 块的 text, cards[])。
 *
 * 设计动机:
 *   agent 无法可靠 emit 独立的结构化字段,但能可靠写 markdown code fence。
 *   用 fence + lang=card 作为 sentinel,解析失败 fallback 保留原文,不影响正常聊天。
 *
 * 解析失败(JSON 坏 / 缺 options)时 fence 原样保留,UI 用 markdown 渲染显示给用户,便于调试。
 */

import { nanoid } from "nanoid"
import type { ChatCard, ChatCardOption } from "../types"

/** 匹配 ```card\n...\n``` fence(lang 标记为 card,对 tilde 不支持)。 */
const CARD_FENCE_RE = /```card\s*\n([\s\S]*?)\n```/g

/**
 * 主入口:从 text 抽 cards。
 * - 无 fence / 解析失败:text 原样返回,cards 空
 * - 解析成功:text 去掉 fence 块,cards 带 id + 合法 options
 */
export function extractCardsFromText(text: string): { text: string; cards: ChatCard[] } {
  if (!text.includes("```card")) return { text, cards: [] }

  const cards: ChatCard[] = []
  const stripped = text.replace(CARD_FENCE_RE, (match, raw: string) => {
    const card = tryParseCard(raw)
    if (!card) return match // 保留原 fence,便于 LLM / user 调试
    cards.push(card)
    return "" // 剔除该块
  })

  // 连续空行压缩
  const cleaned = stripped.replace(/\n{3,}/g, "\n\n").trim()
  return { text: cleaned, cards }
}

function tryParseCard(raw: string): ChatCard | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>

  const optsRaw = obj.options
  if (!Array.isArray(optsRaw) || optsRaw.length === 0) return null

  const options: ChatCardOption[] = []
  for (const entry of optsRaw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const label = typeof e.label === "string" ? e.label.trim() : ""
    if (!label) continue
    const value = typeof e.value === "string" && e.value.trim() ? e.value.trim() : label
    const style = e.style === "primary" || e.style === "danger" || e.style === "default" ? (e.style as ChatCardOption["style"]) : undefined
    options.push({ label, value, style })
  }
  if (options.length === 0) return null

  return {
    id: nanoid(),
    title: typeof obj.title === "string" ? obj.title : undefined,
    description: typeof obj.description === "string" ? obj.description : undefined,
    options,
  }
}
