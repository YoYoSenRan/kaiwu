import { Bot, CircleAlert, FolderX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { useAgentsStore } from "@/stores/agents"
import type { AgentRow } from "@/types/agent"

interface Props {
  row: AgentRow
  onClick: (id: string) => void
}

/**
 * 单个 agent 的卡片。点击展开详情 Drawer。
 * avatar 优先用 avatar_url（gateway resolve 好的），失败 fallback 到 emoji，再 fallback 到 Bot 图标。
 */
export function AgentCard({ row, onClick }: Props) {
  const { t } = useTranslation()
  const live = useAgentsStore((s) => s.live[row.agent])
  const busy = live?.busy ?? false

  return (
    <Card className="hover:border-primary/40 cursor-pointer transition-colors" onClick={() => onClick(row.id)}>
      <CardContent className="flex items-start gap-3 p-4">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={row.avatar_url ?? undefined} alt={row.name} />
          <AvatarFallback className="bg-muted text-base">{row.emoji || <Bot className="size-5 opacity-60" />}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-medium">{row.name}</div>
            {busy ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                {t("agent.card.busy")}
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground truncate font-mono text-xs">{row.agent}</div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px] font-normal">
              {row.model ?? t("agent.card.noModel")}
            </Badge>
            {row.sync_state === "orphan-local" && (
              <Badge variant="destructive" className="gap-1 text-[10px] font-normal">
                <CircleAlert className="size-3" />
                {t("agent.card.orphan")}
              </Badge>
            )}
            {row.sync_state === "workspace-missing" && (
              <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
                <FolderX className="size-3" />
                {t("agent.card.workspaceMissing")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
