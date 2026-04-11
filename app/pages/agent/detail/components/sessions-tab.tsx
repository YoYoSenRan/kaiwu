import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { AgentRow } from "@/types/agent"

/**
 * Sessions Tab：展示该 agent 的会话列表（调 openclaw.session.list 按 agentId 过滤）。
 * 只读，Phase 3 仅做最小可用展示。结构化字段待 openclaw contract 补齐后再扩展。
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

  if (loading) return <div className="text-muted-foreground p-4 text-xs">{t("agent.sessions.loading")}</div>
  if (sessions.length === 0) return <div className="text-muted-foreground p-4 text-xs">{t("agent.sessions.empty")}</div>

  return (
    <div className="space-y-2 p-4">
      {sessions.map((s) => (
        <div key={s.key} className="border-border rounded-md border p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono">{s.label || s.key}</span>
            {s.model && <span className="text-muted-foreground">{s.model}</span>}
          </div>
          {s.lastMessage && <div className="text-muted-foreground mt-1 line-clamp-2">{s.lastMessage}</div>}
        </div>
      ))}
    </div>
  )
}
