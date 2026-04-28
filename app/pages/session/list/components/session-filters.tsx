import { useTranslation } from "react-i18next"

export type ModeFilter = "all" | "direct" | "group"
export type SortOrder = "recent" | "created"

interface Props {
  mode: ModeFilter
  onModeChange: (m: ModeFilter) => void
  sort: SortOrder
  onSortChange: (s: SortOrder) => void
  search: string
  onSearchChange: (q: string) => void
  total: number
}

export function SessionFilters({ mode, onModeChange, sort, onSortChange, search, onSearchChange, total }: Props) {
  const { t } = useTranslation()
  const modes: Array<{ key: ModeFilter; label: string }> = [
    { key: "all", label: t("session.filter.all") },
    { key: "direct", label: t("session.mode.direct") },
    { key: "group", label: t("session.mode.group") },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="bg-muted inline-flex rounded-lg p-0.5">
        {modes.map((m) => {
          const active = mode === m.key
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onModeChange(m.key)}
              className={`btn-focus rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      <input
        type="text"
        placeholder={t("session.filter.search")}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-card ring-foreground/10 focus:ring-primary/40 w-56 rounded-md px-2.5 py-1 text-xs ring-1 transition outline-none focus:ring-2"
      />

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOrder)}
        className="bg-card ring-foreground/10 focus:ring-primary/40 rounded-md px-2 py-1 text-xs ring-1 transition outline-none focus:ring-2"
      >
        <option value="recent">{t("session.filter.sortRecent")}</option>
        <option value="created">{t("session.filter.sortCreated")}</option>
      </select>

      <span className="text-muted-foreground ml-auto text-xs">{t("session.filter.count", { count: total })}</span>
    </div>
  )
}
