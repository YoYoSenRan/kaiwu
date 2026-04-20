import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Bot } from "lucide-react"
import { NavLink } from "react-router"
import { ModeBadge } from "../../components/mode-badge"
import { useAgentCacheStore } from "@/stores/agent"
import { useChatDataStore } from "@/stores/chat"
import type { ChatMember, ChatSession } from "../../../../../electron/features/chat/types"

interface Props {
  session: ChatSession
}

/** 稳定空数组引用:避免 zustand selector 每次返新 `[]` 触发无限重渲染。 */
const EMPTY_MEMBERS: ChatMember[] = []

function formatRelative(ts: number, lang: string): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return lang.startsWith("en") ? "just now" : "刚刚"
  const min = Math.floor(sec / 60)
  if (min < 60) return lang.startsWith("en") ? `${min}m ago` : `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return lang.startsWith("en") ? `${hr}h ago` : `${hr} 小时前`
  const day = Math.floor(hr / 24)
  return lang.startsWith("en") ? `${day}d ago` : `${day} 天前`
}

export function SessionCard({ session }: Props) {
  const { t, i18n } = useTranslation()
  const members = useChatDataStore((s) => s.members[session.id]) ?? EMPTY_MEMBERS
  const refreshMembers = useChatDataStore((s) => s.refreshMembers)
  const byAgentId = useAgentCacheStore((s) => s.byAgentId)

  // 懒加载成员:首次挂载时若 store 无数据则拉一次。effect 里做副作用,不在 render 期间调。
  useEffect(() => {
    if (members.length === 0) void refreshMembers(session.id)
    // 只在 sessionId 变化时触发;members 变化不重拉(避免循环)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  const activeMembers = useMemo(() => members.filter((m) => m.leftAt === null), [members])

  return (
    <NavLink
      to={`/session/${session.id}`}
      className="bg-card text-card-foreground ring-foreground/10 hover:ring-primary/40 block rounded-xl p-4 ring-1 transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ModeBadge mode={session.mode} />
            {session.archived && <span className="text-muted-foreground text-[10px]">{t("session.archived")}</span>}
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold">{session.label ?? t("session.untitled")}</h3>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{session.id}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {activeMembers.slice(0, 4).map((m) => {
            const agent = byAgentId[m.agentId]
            const avatarUrl = agent?.identity?.avatarUrl
            const emoji = agent?.identity?.emoji
            return (
              <div
                key={m.id}
                className="ring-card bg-muted text-muted-foreground flex size-6 items-center justify-center overflow-hidden rounded-full ring-2"
                title={agent?.name ?? m.agentId}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : emoji ? <span className="text-[10px]">{emoji}</span> : <Bot className="size-3" />}
              </div>
            )
          })}
          {activeMembers.length > 4 && <div className="ring-card bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-[9px] ring-2">+{activeMembers.length - 4}</div>}
        </div>
        <span className="text-muted-foreground text-[11px]">{formatRelative(session.updatedAt, i18n.language)}</span>
      </div>
    </NavLink>
  )
}
