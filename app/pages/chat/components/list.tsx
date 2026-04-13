import { Plus, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/stores/chat"
import { ScrollArea } from "@/components/ui/scroll-area"

/** 模式图标，用 emoji 替代硬编码中文避免 i18n 问题。 */
const MODE_ICONS: Record<string, string> = { single: "💬", roundtable: "🔄" }

interface ChatListProps {
  onCreateClick: () => void
}

/** 左侧对话列表面板。 */
export function ChatList({ onCreateClick }: ChatListProps) {
  const { t } = useTranslation()
  const chats = useChatStore((s) => s.chats)
  const activeId = useChatStore((s) => s.activeId)
  const setActiveId = useChatStore((s) => s.setActiveId)
  const [query, setQuery] = useState("")

  const filtered = query ? chats.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())) : chats

  /** 方向键导航对话列表。 */
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()
    const items = filtered
    const idx = items.findIndex((c) => c.id === activeId)
    const next = e.key === "ArrowDown" ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0)
    if (items[next]) setActiveId(items[next].id)
  }

  return (
    <div className="flex w-56 shrink-0 flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("chat.search")} className="h-7 pl-7 text-xs" />
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onCreateClick} title={t("chat.newChat")} aria-label={t("chat.newChat")}>
          <Plus className="size-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-xs">{t("chat.empty")}</p>
        ) : (
          <div className="flex flex-col gap-0.5 px-2 pb-2" role="listbox" aria-label={t("chat.title")} onKeyDown={handleListKeyDown}>
            {filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveId(chat.id)}
                role="option"
                aria-selected={activeId === chat.id}
                className={`focus-visible:ring-ring flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${activeId === chat.id ? "bg-muted" : "hover:bg-muted/50"}`}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-sm" aria-hidden="true">
                  {MODE_ICONS[chat.mode] ?? "💬"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{chat.title}</p>
                  {chat.lastMessage && <p className="text-muted-foreground mt-0.5 truncate text-xs">{chat.lastMessage}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
