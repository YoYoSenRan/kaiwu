import type { ChatInvocationRow } from "@/types/chat"
import { useChatStore } from "@/stores/chat"
import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"
import { parseContent } from "@/lib/content"
import { MessageBlock } from "./block"
import "streamdown/styles.css"

const plugins = { code }

/**
 * Agent 配色方案。用背景 tint 区分身份，
 * 避免 side-stripe borders（AI slop BAN 1）。
 */
const AGENT_COLORS = [
  { bg: "bg-violet-500/8", text: "text-violet-400", avatar: "bg-violet-500/15 text-violet-300" },
  { bg: "bg-emerald-500/8", text: "text-emerald-400", avatar: "bg-emerald-500/15 text-emerald-300" },
  { bg: "bg-amber-500/8", text: "text-amber-400", avatar: "bg-amber-500/15 text-amber-300" },
  { bg: "bg-rose-500/8", text: "text-rose-400", avatar: "bg-rose-500/15 text-rose-300" },
  { bg: "bg-sky-500/8", text: "text-sky-400", avatar: "bg-sky-500/15 text-sky-300" },
  { bg: "bg-pink-500/8", text: "text-pink-400", avatar: "bg-pink-500/15 text-pink-300" },
]

function pickColor(agentId: string, memberIds: string[]) {
  const idx = memberIds.indexOf(agentId)
  return AGENT_COLORS[(idx === -1 ? 0 : idx) % AGENT_COLORS.length]
}

/** token 数量格式化：≥1000 显示为 1.2k。 */
function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

/** 渲染 agent 消息内容：解析 content blocks 并分发渲染。 */
function renderAgentContent(content: string, showToolCalls: boolean, showThinking: boolean) {
  const parsed = parseContent(content)
  if (typeof parsed === "string") {
    return <Streamdown plugins={plugins}>{parsed}</Streamdown>
  }
  return (
    <>
      {parsed.map((block, i) => (
        <MessageBlock key={i} block={block} showToolCalls={showToolCalls} showThinking={showThinking} />
      ))}
    </>
  )
}

/**
 * 消息列表。agent 消息用 Streamdown 渲染 Markdown（代码高亮、表格、列表等），
 * 流式输出时 isAnimating=true 处理不完整的 Markdown 片段。
 */
export function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const members = useChatStore((s) => s.members)
  const activeId = useChatStore((s) => s.activeId)
  const streamingChatId = useChatStore((s) => s.streamingChatId)
  const streamingAgentId = useChatStore((s) => s.streamingAgentId)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const scrollRef = useRef<HTMLDivElement>(null)

  const invocations = useChatStore((s) => s.invocations)

  const memberIds = useMemo(() => members.map((m) => m.agent_id), [members])
  const isMultiAgent = members.length > 1

  const invocationMap = useMemo(() => {
    const map = new Map<string, ChatInvocationRow>()
    for (const inv of invocations) map.set(inv.id, inv)
    return map
  }, [invocations])

  const activeChatConfig = useChatStore((s) => s.chats.find((c) => c.id === s.activeId)?.config ?? "{}")
  const chatConfig = useMemo(() => {
    try {
      return JSON.parse(activeChatConfig) as Record<string, unknown>
    } catch {
      return {}
    }
  }, [activeChatConfig])
  const showToolCalls = chatConfig.showToolCalls === true
  const showThinking = chatConfig.showThinking === true

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, streamingContent])

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite">
      <div className="flex flex-col gap-3 p-4">
        {messages.map((msg) => {
          if (msg.sender_type === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-primary/10 max-w-[75%] rounded-xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            )
          }
          const color = msg.sender_agent_id ? pickColor(msg.sender_agent_id, memberIds) : AGENT_COLORS[0]
          return (
            <div key={msg.id} className="flex gap-2.5">
              <span className={`${color.avatar} mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium`}>
                {(msg.sender_agent_id ?? "AI").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                {isMultiAgent && msg.sender_agent_id && <p className={`${color.text} mb-1 text-xs font-medium`}>{msg.sender_agent_id}</p>}
                <div className={`${isMultiAgent ? color.bg : "bg-muted/50"} max-w-[85%] rounded-xl rounded-tl-sm px-3 py-2 text-sm`}>
                  {renderAgentContent(msg.content, showToolCalls, showThinking)}
                </div>
                {msg.invocation_id &&
                  (() => {
                    const inv = invocationMap.get(msg.invocation_id)
                    if (!inv) return null
                    return (
                      <p className="text-muted-foreground/60 mt-1 flex flex-wrap gap-2 text-[10px]">
                        {inv.input_tokens != null && <span>↑{formatTokens(inv.input_tokens)}</span>}
                        {inv.output_tokens != null && <span>↓{formatTokens(inv.output_tokens)}</span>}
                        {inv.cache_read != null && inv.cache_read > 0 && <span>R{formatTokens(inv.cache_read)}</span>}
                        {inv.cache_write != null && inv.cache_write > 0 && <span>W{formatTokens(inv.cache_write)}</span>}
                        {inv.cost != null && <span>${inv.cost.toFixed(4)}</span>}
                        {inv.model && <span>{inv.model}</span>}
                      </p>
                    )
                  })()}
              </div>
            </div>
          )
        })}

        {/* 只渲染当前对话的流式输出，避免其他对话（如后台圆桌）的 delta 串台 */}
        {streamingMessageId &&
          streamingChatId === activeId &&
          (() => {
            const streamColor = streamingAgentId ? pickColor(streamingAgentId, memberIds) : AGENT_COLORS[0]
            const streamLabel = (streamingAgentId ?? "AI").slice(0, 2).toUpperCase()
            return (
              <div className="flex gap-2.5" aria-label="Agent is responding">
                <span className={`${streamColor.avatar} mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium`}>{streamLabel}</span>
                <div className={`max-w-[85%] rounded-xl rounded-tl-sm ${isMultiAgent ? streamColor.bg : "bg-muted/50"} px-3 py-2 text-sm`}>
                  <Streamdown plugins={plugins}>{streamingContent}</Streamdown>
                </div>
              </div>
            )
          })()}
      </div>
    </div>
  )
}
