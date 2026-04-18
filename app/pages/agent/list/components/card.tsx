import { Bot } from "lucide-react"
import { NavLink } from "react-router"
import { Card, CardContent } from "@/components/ui/card"

interface AgentCardProps {
  id: string
  name?: string
  workspace?: string
  modelPrimary?: string
  avatarUrl?: string
  emoji?: string
  /** 是否让卡片响应点击跳详情。unsynced / missing tab 不跳。 */
  to?: string
}

export function AgentCard({ id, name, workspace, modelPrimary, avatarUrl, emoji, to }: AgentCardProps) {
  const body = (
    <Card>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : emoji ? (
              <span className="text-lg">{emoji}</span>
            ) : (
              <Bot className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium">{name ?? id}</p>
            {modelPrimary && <p className="text-muted-foreground truncate text-xs">{modelPrimary}</p>}
            {workspace && <p className="text-muted-foreground/70 truncate text-[11px]">{workspace}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (to) return <NavLink to={to}>{body}</NavLink>
  return body
}
