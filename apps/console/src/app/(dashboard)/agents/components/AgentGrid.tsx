"use client"

import Link from "next/link"
import type { Agent } from "@kaiwu/db"
import { AgentCard } from "./AgentCard"

interface AgentGridProps {
  agents: Agent[]
}

export function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">尚未部署模板</p>
          <Link href="/templates" className="text-sm text-primary underline">
            前往模板管理部署
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          status={agent.status as "online" | "idle" | "offline" | "error" | "unsynced"}
          lastSeenAt={agent.lastSeenAt?.toISOString() ?? null}
        />
      ))}
    </div>
  )
}
