import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  kbId: string
}

/** 检索测试 tab。 */
export function SearchTab({ kbId }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Awaited<ReturnType<typeof window.electron.knowledge.search.query>>>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await window.electron.knowledge.search.query({ query: query.trim(), kbIds: [kbId] })
      setResults(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("knowledge.search.placeholder")} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          <Search className="mr-1.5 size-4" />
          {t("knowledge.tabs.search")}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {results.length === 0 && !loading && query && (
          <p className="text-muted-foreground py-8 text-center text-sm">{t("knowledge.search.noResults")}</p>
        )}

        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.chunkId} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{t("knowledge.search.score")}: {(r.score * 100).toFixed(1)}%</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
