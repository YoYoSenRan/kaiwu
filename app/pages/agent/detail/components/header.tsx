import { useState } from "react"
import { Bot, ChevronLeft, Copy, Pencil, Trash2 } from "lucide-react"
import { useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AgentDetail } from "@contracts/agent"

interface Props {
  detail: AgentDetail | null
  defaultId?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function AgentDetailHeader({ detail, defaultId, onEdit, onDelete }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const gateway = detail?.gateway
  const identity = detail?.identity

  const name = gateway?.name ?? identity?.name ?? detail?.agentId ?? ""
  const avatarUrl = gateway?.identity?.avatarUrl ?? identity?.avatarUrl
  const emoji = gateway?.identity?.emoji ?? identity?.emoji
  const primaryModel = gateway?.model?.primary
  const isDefault = defaultId && detail?.agentId === defaultId
  const workspace = gateway?.workspace

  const handleCopyId = async () => {
    if (!detail?.agentId) return
    await navigator.clipboard.writeText(detail.agentId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 pt-2 pb-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/agent")}>
          <ChevronLeft className="mr-1 size-4" />
          {t("common.back")}
        </Button>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1 size-4" />
              {t("common.edit")}
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="mr-1 size-4" />
              {t("common.delete")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-5">
        <div className="from-primary/20 to-primary/5 text-primary flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br">
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

          {workspace && <p className="text-muted-foreground font-mono text-sm">{workspace}</p>}

          {detail?.agentId && (
            <div className="flex items-center gap-1.5">
              <p className="text-muted-foreground font-mono text-xs">{detail.agentId}</p>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground size-5" onClick={handleCopyId}>
                <Copy className={`size-3 ${copied ? "text-green-500" : ""}`} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
