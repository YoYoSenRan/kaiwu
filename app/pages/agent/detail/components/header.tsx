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
    <div className="flex flex-col gap-6 pt-2 pb-4">
      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/agent")}>
          <ChevronLeft className="mr-1 size-4" />
          {t("common.back")}
        </Button>
      </div>

      <div className="flex items-start gap-5">
        <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : emoji ? <span className="text-3xl">{emoji}</span> : <Bot className="size-8" />}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold tracking-tight">{name}</h1>
            <div className="flex shrink-0 items-center gap-2">
              {primaryModel && (
                <Badge variant="secondary" className="font-normal">
                  {primaryModel}
                </Badge>
              )}
              {isDefault && <Badge className="font-normal">{t("agent.detail.defaultBadge")}</Badge>}
            </div>
          </div>
          {detail?.agentId && <p className="text-muted-foreground font-mono text-xs">{detail.agentId}</p>}
        </div>
      </div>
    </div>
  )
}
