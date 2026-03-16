"use client"

import { cn } from "@/lib/utils"

export type AgentStatus = "online" | "idle" | "offline" | "error" | "unsynced"

const STATUS_STYLES: Record<AgentStatus, { dot: string; pulse?: string; label: string }> = {
  online: { dot: "bg-green-500", pulse: "animate-pulse", label: "在线" },
  idle: { dot: "bg-yellow-500", label: "空闲" },
  offline: { dot: "bg-gray-400", label: "离线" },
  error: { dot: "bg-red-500", label: "异常" },
  unsynced: { dot: "bg-orange-400", label: "未同步" },
}

interface AgentStatusDotProps {
  status: AgentStatus
  showLabel?: boolean
}

export function AgentStatusDot({ status, showLabel = false }: AgentStatusDotProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.offline

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", style.dot, style.pulse)} />
      {showLabel && <span className="text-xs text-muted-foreground">{style.label}</span>}
    </span>
  )
}
