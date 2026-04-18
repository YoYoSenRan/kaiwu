import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { MessageSquare, MoreVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useChatDataStore, useChatUiStore } from "@/stores/chat"
import { CreateChatDialog } from "./create-dialog"
import { DeleteChatDialog } from "./delete-dialog"

export function ChatSidebar() {
  const { t } = useTranslation()
  const sessions = useChatDataStore((s) => s.sessions)
  const refreshSessions = useChatDataStore((s) => s.refreshSessions)
  const refreshMessages = useChatDataStore((s) => s.refreshMessages)
  const refreshMembers = useChatDataStore((s) => s.refreshMembers)
  const currentSessionId = useChatUiStore((s) => s.currentSessionId)
  const setCurrent = useChatUiStore((s) => s.setCurrent)
  const deleteSession = useChatDataStore((s) => s.deleteSession)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  async function handleSelect(id: string) {
    setCurrent(id)
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
        <Input placeholder={t("chat.search")} />
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">{t("chat.sessions.empty")}</p>
        ) : (
          sessions.map((s) => {
            const active = s.id === currentSessionId
            return (
              <div
                key={s.id}
                className={`group flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/80"}`}
              >
                <button onClick={() => handleSelect(s.id)} className="flex flex-1 items-center gap-3 overflow-hidden">
                  <MessageSquare className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex flex-col items-start truncate">
                    <span className="mb-1.5 w-full truncate text-left leading-none">{s.label ?? s.id}</span>
                    <span className={`text-[11px] leading-none ${active ? "text-primary/70" : "text-muted-foreground"}`}>{s.mode}</span>
                  </div>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover:bg-muted rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
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
