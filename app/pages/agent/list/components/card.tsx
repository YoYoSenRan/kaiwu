import { Bot, Cpu, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { NavLink } from "react-router"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/utils/utils"

interface AgentCardProps {
  id: string
  name?: string
  workspace?: string
  modelPrimary?: string
  avatarUrl?: string
  emoji?: string
  isDefault?: boolean
  to?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function AgentCard({ id, name, workspace, modelPrimary, avatarUrl, emoji, isDefault, to, onEdit, onDelete }: AgentCardProps) {
  const body = (
    <Card
      className={cn(
        "group/card relative overflow-hidden transition-all duration-300",
        "hover:shadow-foreground/5 hover:-translate-y-0.5 hover:shadow-lg",
        "flex h-full flex-col border-0 shadow-none",
        to && "cursor-pointer",
      )}
    >
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div className={cn("flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl", "from-primary/20 to-primary/5 bg-gradient-to-br")}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : emoji ? (
              <span className="text-2xl">{emoji}</span>
            ) : (
              <Bot className="text-primary size-7" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{name ?? id}</p>
              {isDefault && (
                <Badge variant="default" className="h-4 px-1.5 py-0 text-[10px]">
                  默认
                </Badge>
              )}
            </div>

            {workspace && <p className="text-muted-foreground truncate font-mono text-xs">{workspace}</p>}

            {modelPrimary && (
              <Badge variant="secondary" className="h-5 gap-0.5 px-1.5 py-0 text-[11px] font-normal">
                <Cpu className="size-3" />
                {modelPrimary}
              </Badge>
            )}
          </div>

          {(onEdit || onDelete) && (
            <div className="opacity-0 transition-opacity group-hover/card:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.preventDefault()}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        onEdit()
                      }}
                    >
                      <Pencil className="mr-2 size-4" />
                      编辑
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        onDelete()
                      }}
                    >
                      <Trash2 className="mr-2 size-4" />
                      删除
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="text-muted-foreground mt-auto flex items-center gap-2 pt-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            在线
          </span>
        </div>
      </CardContent>
    </Card>
  )

  if (to) return <NavLink to={to}>{body}</NavLink>
  return body
}
