/**
 * 流式回复气泡:带 typing 语义 ("agent 回复中…") 与流式 markdown 渲染。
 * 用于 renderer 的 `store.streaming[sessionId]` 里每一条未完成的 delta buffer。
 */

import { useTranslation } from "react-i18next"
import { Streamdown, type BundledTheme } from "streamdown"
import { wrapMentionsWithTag } from "@/lib/chat-mention"
import { Avatar } from "./message-row"
import { MentionChip } from "./mention-chip"

const SHIKI_THEME: [BundledTheme, BundledTheme] = ["github-light", "github-dark"]
const STREAMDOWN_ALLOWED_TAGS: { mention: string[] } = { mention: ["agent_id"] }
const STREAMDOWN_LITERAL_TAGS: string[] = ["mention"]
// biome-ignore lint: streamdown Components 类型含 node 等额外 props,用通用签名承接
const STREAMDOWN_COMPONENTS = { mention: MentionChip as unknown as React.ElementType }

interface Props {
  content: string
  agentName?: string
  avatarUrl?: string
  emoji?: string
  memberAgentIds: string[]
}

export function StreamingRow({ content, agentName, avatarUrl, emoji, memberAgentIds }: Props) {
  const { t } = useTranslation()
  const rendered = wrapMentionsWithTag(content, memberAgentIds)
  return (
    <div className="flex flex-row gap-3" aria-live="polite" aria-busy="true">
      <Avatar isUser={false} avatarUrl={avatarUrl} emoji={emoji} />
      <div className="flex max-w-[72%] flex-col items-start gap-1">
        {agentName && (
          <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-[11px]">
            <span className="text-foreground font-medium">{agentName}</span>
            <span className="text-primary">{t("chat.delivery.replying")}…</span>
          </p>
        )}
        <div className="bg-muted text-foreground ring-primary/30 rounded-2xl px-3 py-2 text-sm ring-1">
          {content ? (
            <Streamdown
              mode="streaming"
              parseIncompleteMarkdown
              caret="block"
              shikiTheme={SHIKI_THEME}
              className="markdown-prose"
              allowedTags={STREAMDOWN_ALLOWED_TAGS}
              literalTagContent={STREAMDOWN_LITERAL_TAGS}
              components={STREAMDOWN_COMPONENTS}
            >
              {rendered}
            </Streamdown>
          ) : (
            <span className="text-muted-foreground">…</span>
          )}
        </div>
      </div>
    </div>
  )
}
