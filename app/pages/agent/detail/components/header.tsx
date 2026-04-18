import { Bot, ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AgentDetail } from "@contracts/agent"

interface Props {
  detail: AgentDetail | null
  defaultId?: string
}

export function AgentDetailHeader({ detail, defaultId }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const gateway = detail?.gateway
  const identity = detail?.identity

  const name = gateway?.name ?? identity?.name ?? detail?.agentId ?? ""
  const avatarUrl = gateway?.identity?.avatarUrl ?? identity?.avatarUrl
  const emoji = gateway?.identity?.emoji ?? identity?.emoji
  const primaryModel = gateway?.model?.primary
  const isDefault = defaultId && detail?.agentId === defaultId

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/agent")}>
          <ChevronLeft className="mr-1 size-4" />
          {t("common.back")}
        </Button>
      </div>

      <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : emoji ? (
          <span className="text-lg">{emoji}</span>
        ) : (
          <Bot className="size-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight">{name}</h1>
        {detail?.agentId && <p className="text-muted-foreground truncate text-xs">{detail.agentId}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {primaryModel && <Badge variant="secondary">{primaryModel}</Badge>}
        {isDefault && <Badge>{t("agent.detail.defaultBadge")}</Badge>}
      </div>
    </div>
  )
}
