"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  agentEmoji: string
  agentName: string
  agentTitle: string
  content: string
  type: string
  createdAt: string
}

interface ChatFeedProps {
  initialMessages: ChatMessage[]
}

/** 群聊记录——聚合 agent_logs + events，SSE 实时追加 */
export function ChatFeed({ initialMessages }: ChatFeedProps): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)

  useEffect(() => {
    const es = new EventSource("/api/pipeline/events/stream")

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: string; title?: string; agentId?: string; createdAt?: string; detail?: unknown }
        if (!data.type || !data.title) return

        // 只展示有叙事价值的事件
        const showTypes = new Set(["agent_dispatched", "agent_completed", "phase_transition", "project_created", "project_sealed", "debate_speech"])
        if (!showTypes.has(data.type)) return

        const msg: ChatMessage = {
          id: `sse-${event.lastEventId ?? Date.now()}`,
          agentEmoji: "📢",
          agentName: data.agentId ?? "开物局",
          agentTitle: "",
          content: data.title,
          type: data.type,
          createdAt: data.createdAt ?? new Date().toISOString(),
        }

        setMessages((prev) => [...prev, msg])
      } catch {
        // 忽略解析错误
      }
    }

    return () => es.close()
  }, [])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-display font-600">群聊记录</h2>
      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto rounded-lg border border-border bg-surface p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-fg text-center py-8">暂无消息。等待更鼓响起。</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2">
              <span className="text-lg shrink-0">{msg.agentEmoji}</span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-500 text-foreground">{msg.agentName}</span>
                  {msg.agentTitle && <span className="text-xs text-muted-fg">· {msg.agentTitle}</span>}
                  <span className="text-xs text-muted-fg">{formatTime(msg.createdAt)}</span>
                </div>
                <p className={cn("text-sm text-foreground/80", msg.type === "project_sealed" && "text-muted-fg italic")}>{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}
