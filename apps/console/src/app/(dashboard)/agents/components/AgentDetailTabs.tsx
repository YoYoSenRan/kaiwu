"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { DETAIL_TABS, type DetailTab } from "../constants"

interface AgentDetailTabsProps {
  agentId: string
  children: Record<DetailTab, React.ReactNode>
}

export function AgentDetailTabs({ agentId, children }: AgentDetailTabsProps) {
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get("tab") as DetailTab) ?? "overview"

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border">
        {DETAIL_TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/agents/${agentId}?tab=${key}`}
            className={cn(
              "px-4 py-2 text-sm transition-colors",
              currentTab === key ? "border-b-2 border-primary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      <div>{children[currentTab]}</div>
    </div>
  )
}
