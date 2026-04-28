/**
 * Context 拼装原语。
 *
 * 群聊和 flow 共用：把多条消息 + 成员花名册序列化为 agent prompt 里可读的文本块。
 */

export interface TranscriptEntry {
  /** "user" 或 agent 的 identity.name / agent_id。 */
  senderLabel: string
  content: string
  ts: number
}

/**
 * 把消息序列化为 plain transcript，格式：
 *   [user @ 14:32]
 *   问题
 *
 *   [alice @ 14:33]
 *   回答
 */
export function renderTranscript(entries: TranscriptEntry[]): string {
  return entries
    .map((e) => {
      const time = new Date(e.ts).toISOString().slice(11, 16) // HH:MM
      return `[${e.senderLabel} @ ${time}]\n${e.content}`
    })
    .join("\n\n")
}

/** 成员花名册：告诉 agent 群里都有谁、自己是谁。 */
export interface RosterEntry {
  agentId: string
  displayName: string
  replyMode: "auto" | "mention"
  isSelf?: boolean
}

export function renderRoster(entries: RosterEntry[]): string {
  const lines = entries.map((e) => {
    const tag = e.isSelf ? "（你）" : ""
    return `- ${e.agentId}${tag}：${e.displayName}（${e.replyMode === "auto" ? "自动参与" : "被@才回"}）`
  })
  return `群成员：\n${lines.join("\n")}`
}
