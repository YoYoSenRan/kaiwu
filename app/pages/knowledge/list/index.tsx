import { Plus, Library } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { KnowledgeCard } from "./components/card"
import { useKnowledgeList } from "../hooks/use-knowledge"
import { CreateKnowledgeDialog } from "./components/create-dialog"

/** 知识库列表页。 */
export default function KnowledgeList() {
  const { t } = useTranslation()
  const { list, loading, refresh } = useKnowledgeList()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t("knowledge.count", { count: list.length })}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          {t("knowledge.create")}
        </Button>
      </div>

      {!loading && list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Library className="text-muted-foreground size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("knowledge.emptyTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("knowledge.emptyDescription")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((kb) => (
            <KnowledgeCard key={kb.id} id={kb.id} name={kb.name} description={kb.description} docCount={kb.doc_count} chunkCount={kb.chunk_count} />
          ))}
        </div>
      )}

      <CreateKnowledgeDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </div>
  )
}
