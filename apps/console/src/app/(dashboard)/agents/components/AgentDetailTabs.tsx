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

  function getTabHref(tab: DetailTab): string {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("tab", tab)
    return `/agents/${agentId}?${nextParams.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-2xl border border-border/70 bg-muted/30 p-1">
          {DETAIL_TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={getTabHref(key)}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                currentTab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div>{children[currentTab]}</div>
    </div>
  )
}
