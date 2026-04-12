import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocumentsTab } from "./components/documents-tab"
import { SearchTab } from "./components/search-tab"
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

  // 订阅进度事件：中间态更新 progressMap，终态清除并 refresh 拿最终数据
  useEffect(() => {
    const unsub = window.electron.knowledge.doc.onProgress((event) => {
      if (event.state === "ready" || event.state === "failed") {
        setProgressMap((prev) => { const next = new Map(prev); next.delete(event.docId); return next })
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 终态刷新一次拿最终数据
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{row.name}</h1>
        {row.description && <p className="text-muted-foreground mt-1 text-sm">{row.description}</p>}
        <p className="text-muted-foreground mt-1 text-xs">
          {row.doc_count} docs · {row.chunk_count} chunks · {row.embedding_model}
        </p>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">{t("knowledge.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="search">{t("knowledge.tabs.search")}</TabsTrigger>
          <TabsTrigger value="settings">{t("knowledge.tabs.settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="documents">
          <DocumentsTab kbId={row.id} docs={docs} progressMap={progressMap} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="search">
          <SearchTab kbId={row.id} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab id={row.id} name={row.name} description={row.description} embeddingModel={row.embedding_model} onUpdated={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
