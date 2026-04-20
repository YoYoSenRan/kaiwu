import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Archive, History } from "lucide-react"
import { useSessionsList } from "../hooks/use-sessions-list"
import { SessionCard } from "./components/session-card"
import { SessionFilters, type ModeFilter, type SortOrder } from "./components/session-filters"

export default function SessionList() {
  const { t } = useTranslation()
  const { sessions } = useSessionsList()
  const [mode, setMode] = useState<ModeFilter>("all")
  const [sort, setSort] = useState<SortOrder>("recent")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    let list = sessions
    if (mode !== "all") list = list.filter((s) => s.mode === mode)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((s) => (s.label ?? "").toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    list = [...list].sort((a, b) => {
      if (sort === "recent") return b.updatedAt - a.updatedAt
      return b.createdAt - a.createdAt
    })
    return list
  }, [sessions, mode, sort, search])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <History className="text-primary size-5" />
        <h1 className="text-lg font-semibold tracking-tight">{t("session.title")}</h1>
      </div>

      <SessionFilters mode={mode} onModeChange={setMode} sort={sort} onSortChange={setSort} search={search} onSearchChange={setSearch} total={filtered.length} />

      {filtered.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-12">
          <Archive className="size-10" />
          <p className="text-sm">{t("session.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  )
}
