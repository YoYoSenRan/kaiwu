import { Bot } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { AgentCard } from "./card"
import type { AgentListResult } from "@contracts/agent"

interface Props {
  entries: AgentListResult["mine"]
}

export function MineTab({ entries }: Props) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Bot className="text-muted-foreground size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("agent.emptyTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("agent.emptyDescription")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((e) => (
        <AgentCard
          key={e.agentId}
          id={e.agentId}
          name={e.gateway?.name}
          workspace={e.gateway?.workspace}
          modelPrimary={e.gateway?.model?.primary}
          avatarUrl={e.gateway?.identity?.avatarUrl}
          emoji={e.gateway?.identity?.emoji}
          to={`/agent/${e.agentId}`}
        />
      ))}
    </div>
  )
}
