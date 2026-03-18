"use client"

import { cn } from "@/lib/utils"

interface AgentBubbleProps {
  emoji: string
  name: string
  title: string
  status: string
  activity: string | null
}

/** Agent 状态气泡——emoji + 名称 + 活动描述 */
export function AgentBubble({ emoji, name, title, status, activity }: AgentBubbleProps): React.ReactElement {
  const isWorking = status === "working" || status === "thinking" || status === "debating"

  return (
    <div className="flex flex-col items-center gap-1 w-20">
      <div className={cn("relative text-2xl", isWorking && "animate-bounce")}>
        {emoji}
        <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface", isWorking ? "bg-green-500" : "bg-muted-fg/40")} />
      </div>
      <span className="text-xs font-500 text-foreground truncate w-full text-center">{name}</span>
      <span className="text-[10px] text-muted-fg truncate w-full text-center">{activity ?? `${title}，闲着`}</span>
    </div>
  )
}
