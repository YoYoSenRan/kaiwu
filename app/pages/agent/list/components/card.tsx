import { Bot } from "lucide-react"
import { NavLink } from "react-router"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : emoji ? <span className="text-lg">{emoji}</span> : <Bot className="size-5" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium">{name ?? id}</p>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {modelPrimary && (
                <Badge variant="secondary" className="h-5 px-1.5 py-0 text-[11px] font-normal">
                  {modelPrimary}
                </Badge>
              )}
              {workspace && (
                <Badge variant="outline" className="text-muted-foreground border-muted/60 h-5 px-1.5 py-0 text-[11px] font-normal">
                  {workspace}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (to) return <NavLink to={to}>{body}</NavLink>
  return body
}
