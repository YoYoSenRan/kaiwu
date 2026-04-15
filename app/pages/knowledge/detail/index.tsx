import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GraphTab } from "./components/graph-tab"
import { SearchTab } from "./components/search-tab"
import { DocumentsTab } from "./components/documents-tab"
import { SettingsTab } from "./components/settings-tab"

/** 知识库详情页。 */
export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof window.electron.knowledge.base.detail>> | null>(null)
  const [progressMap, setProgressMap] = useState<Map<string, { progress: number; state: string }>>(new Map())

  const refresh = useCallback(async () => {
    if (!id) return
    const data = await window.electron.knowledge.base.detail(id)
    setDetail(data)
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载，与 useAgentDetail 同模式
    void refresh()
  }, [refresh])

  useEffect(() => {
    const unsub = window.electron.knowledge.doc.onProgress((event) => {
      if (event.state === "ready" || event.state === "failed") {
        setProgressMap((prev) => {
          const next = new Map(prev)
          next.delete(event.docId)
          return next
        })
        void refresh()
      } else {
        setProgressMap((prev) => new Map(prev).set(event.docId, event))
      }
    })
    return unsub
  }, [refresh])

  if (!detail) return null

  const { row, docs } = detail

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight">{row.name}</h1>
          {row.description && <p className="text-muted-foreground truncate text-sm">{row.description}</p>}
        </div>
        <p className="text-muted-foreground shrink-0 text-xs">
          {row.doc_count} docs · {row.chunk_count} chunks · {row.embedding_model}
        </p>
      </div>

      <Tabs defaultValue="documents" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="documents">{t("knowledge.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="search">{t("knowledge.tabs.search")}</TabsTrigger>
          <TabsTrigger value="graph">{t("knowledge.tabs.graph")}</TabsTrigger>
          <TabsTrigger value="settings">{t("knowledge.tabs.settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DocumentsTab kbId={row.id} docs={docs} progressMap={progressMap} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="search" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SearchTab kbId={row.id} />
        </TabsContent>
        <TabsContent value="graph" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <GraphTab kbId={row.id} kbName={row.name} docs={docs} />
        </TabsContent>
        <TabsContent value="settings" className="min-h-0 flex-1 overflow-y-auto">
          <SettingsTab id={row.id} name={row.name} description={row.description} embeddingModel={row.embedding_model} onUpdated={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
