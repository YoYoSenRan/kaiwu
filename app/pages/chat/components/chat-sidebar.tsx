import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bot, MoreVertical, Plus, Search, Trash2, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"
import { CreateChatDialog } from "./create-dialog"
import { DeleteChatDialog } from "./delete-dialog"

export function ChatSidebar() {
  const { t } = useTranslation()
  const sessions = useChatDataStore((s) => s.sessions)
  const sessionActivity = useChatDataStore((s) => s.sessionActivity)
  const sessionLastText = useChatDataStore((s) => s.sessionLastText)
  const unread = useChatDataStore((s) => s.unread)
  const members = useChatDataStore((s) => s.members)
  const refreshSessions = useChatDataStore((s) => s.refreshSessions)
  const refreshMessages = useChatDataStore((s) => s.refreshMessages)
  const refreshMembers = useChatDataStore((s) => s.refreshMembers)
  const clearUnread = useChatDataStore((s) => s.clearUnread)
  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const setCurrent = useChatUiStore((s) => s.setCurrent)
  const deleteSession = useChatDataStore((s) => s.deleteSession)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const sortedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      const ta = sessionActivity[a.id] ?? a.updatedAt
      const tb = sessionActivity[b.id] ?? b.updatedAt
      return tb - ta
    })
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((s) => {
      const label = (s.label ?? s.id).toLowerCase()
      const preview = (sessionLastText[s.id] ?? "").toLowerCase()
      const mode = s.mode.toLowerCase()
      return label.includes(q) || preview.includes(q) || mode.includes(q)
    })
  }, [sessions, sessionActivity, sessionLastText, query])

  async function handleSelect(id: string) {
    setCurrent(id)
    clearUnread(id)
    // 进入会话先对账一次（拉 openclaw history 补缺失消息），再拉 kaiwu DB
    try {
      await window.electron.chat.session.reconcile(id)
    } catch {
      /* reconcile 失败不影响 UI */
    }
    void refreshMessages(id)
    refreshMembers(id)
  }

  async function handleCreated(sessionId: string) {
    await refreshSessions()
    setCurrent(sessionId)
    void refreshMessages(sessionId)
    void refreshMembers(sessionId)
  }

  function openDelete(id: string) {
    setPendingDeleteId(id)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!pendingDeleteId) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    setDeleteOpen(false)
    if (currentSessionId === id) {
      setCurrent(null)
    }
    await deleteSession(id)
  }

  return (
    <div className="bg-card text-card-foreground ring-foreground/10 hidden w-64 flex-col overflow-hidden rounded-xl ring-1 md:flex lg:w-72">
      <div className="border-border/50 flex shrink-0 flex-col gap-3 border-b p-4">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          <span>{t("chat.new")}</span>
        </Button>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("chat.search")} className="h-8 pr-8 pl-8 text-xs" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("common.clear")}
              className="btn-focus text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-4 -translate-y-1/2 items-center justify-center rounded transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {sortedSessions.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">{query ? t("chat.sessions.noMatch") : t("chat.sessions.empty")}</p>
        ) : (
          sortedSessions.map((s) => {
            const active = s.id === currentSessionId
            const preview = sessionLastText[s.id] ?? ""
            const unreadCount = unread[s.id] ?? 0
            return (
              <div
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`btn-focus group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/80"}`}
              >
                {s.mode === "group" ? (
                  <Users className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                ) : (
                  <Bot className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                )}
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <div className="flex w-full items-center gap-2">
                    <span className="min-w-0 flex-1 truncate leading-none">{s.label ?? s.id}</span>
                    {unreadCount > 0 && !active && (
                      <span className="bg-primary text-primary-foreground flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className={`flex w-full items-center justify-between text-[11px] leading-none ${active ? "text-primary/70" : "text-muted-foreground"}`}>
                    <span className="truncate">{preview || (s.mode === "group" ? t("chat.mode.group") : t("chat.mode.direct"))}</span>
                    {s.mode === "group" && members[s.id]?.length > 0 && (
                      <span className="ml-1 shrink-0">
                        {members[s.id].length} {t("chat.members.count")}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="btn-focus hover:bg-muted rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      aria-label={t("common.detail")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" onClick={() => openDelete(s.id)}>
                      <Trash2 className="size-4" />
                      <span>{t("common.delete")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })
        )}
      </div>

      <CreateChatDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <DeleteChatDialog
        open={deleteOpen}
        name={sessions.find((s) => s.id === pendingDeleteId)?.label ?? pendingDeleteId ?? ""}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
