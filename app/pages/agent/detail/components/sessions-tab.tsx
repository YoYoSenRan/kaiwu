import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { AgentRow } from "@/types/agent"
import { MessageSquare } from "lucide-react"

/**
 * Sessions Tab：展示该 agent 的会话列表（调 openclaw.session.list 按 agentId 过滤）。
 * 点击会话可跳转至聊天页。
 */
interface Props {
  row: AgentRow
}

interface SessionEntry {
  key?: string
  label?: string | null
  model?: string | null
  updatedAt?: number
  lastMessage?: string
}

export function SessionsTab({ row }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const loading = loadedFor !== row.agent

  useEffect(() => {
    window.electron.openclaw.session
      .list({ agentId: row.agent })
      .then((res) => {
        const arr = Array.isArray((res as { sessions?: SessionEntry[] })?.sessions) ? ((res as { sessions: SessionEntry[] }).sessions ?? []) : []
        setSessions(arr)
        setLoadedFor(row.agent)
      })
      .catch(() => {
        setSessions([])
        setLoadedFor(row.agent)
      })
  }, [row.agent])

  const formatTime = (ms?: number) => {
    if (!ms) return ""
    const d = new Date(ms)
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  if (loading) return <div className="text-muted-foreground p-4 text-xs">{t("agent.sessions.loading")}</div>
  if (sessions.length === 0) return <div className="text-muted-foreground p-4 text-xs">{t("agent.sessions.empty")}</div>

  return (
    <div className="space-y-2 p-1">
      {sessions.map((s) => (
        <div
          key={s.key}
          className="border-border hover:bg-muted/50 hover:border-primary/30 cursor-pointer rounded-md border p-3 transition-colors"
          onClick={() => navigate(`/chat?agentId=${row.agent}&sessionKey=${s.key}`)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-muted-foreground size-4" />
              <span className="text-sm font-medium">{s.label || s.key}</span>
            </div>
            <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
              {s.model && <span className="bg-muted rounded-sm px-1.5 py-0.5 font-mono text-[10px]">{s.model}</span>}
              {s.updatedAt && <span>{formatTime(s.updatedAt)}</span>}
            </div>
          </div>
          {s.lastMessage && <div className="text-muted-foreground mt-1 line-clamp-2 pl-6 text-xs">{s.lastMessage}</div>}
        </div>
      ))}
    </div>
  )
}
