import { EmptyState } from "./empty-state"
import { AgentCard } from "./card"
import type { AgentListResult } from "@contracts/agent"

interface Props {
  entries: AgentListResult["mine"]
}

export function MineTab({ entries }: Props) {
  if (entries.length === 0) {
    return <EmptyState type="mine" />
  }

  return (
    <div className="grid gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((e, i) => (
        <div
          key={e.agentId}
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
          style={{ animationDelay: `${i * 60}ms`, animationDuration: "400ms" }}
        >
          <AgentCard
            id={e.agentId}
            name={e.gateway?.name}
            workspace={e.gateway?.workspace}
            modelPrimary={e.gateway?.model?.primary}
            avatarUrl={e.gateway?.identity?.avatarUrl}
            emoji={e.gateway?.identity?.emoji}
            to={`/agent/${e.agentId}`}
          />
        </div>
      ))}
    </div>
  )
}
