import { motion } from "motion/react"
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
 * 单个 agent 的卡片。点击跳转到详情页。
 * avatar 优先用 avatar_url，失败 fallback 到 emoji，再 fallback 到 Bot 图标。
 */
export function AgentCard({ row, onClick }: Props) {
  const { t } = useTranslation()
  const live = useAgentsStore((s) => s.live[row.agent])
  const busy = live?.busy ?? false

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
      <Card className="hover:border-primary/30 cursor-pointer transition-all duration-200 hover:shadow-md" onClick={() => onClick(row.id)}>
        <CardContent className="flex items-start gap-3 p-4">
          <div className="relative shrink-0">
            <Avatar className="size-10">
              <AvatarImage src={row.avatar_url ?? undefined} alt={row.name} />
              <AvatarFallback className="bg-muted text-base">{row.emoji || <Bot className="size-5 opacity-60" />}</AvatarFallback>
            </Avatar>
            {busy && (
              <span className="border-background absolute -right-0.5 -bottom-0.5 flex size-3 items-center justify-center rounded-full border-2 bg-emerald-500">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="truncate text-base leading-tight font-semibold">{row.name}</div>
            <div className="text-muted-foreground/60 truncate font-mono text-[11px]">{row.agent}</div>
          </div>
        </CardContent>

        <div className="border-border/50 flex h-9 items-center border-t px-4">
          <div className="flex flex-wrap items-center gap-1.5">
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
      </Card>
    </motion.div>
  )
}
