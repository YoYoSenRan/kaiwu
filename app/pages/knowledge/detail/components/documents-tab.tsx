import { ChevronDown, FileText, RotateCcw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChunkList } from "./chunk-list"
import { UploadZone } from "./upload-zone"

interface Props {
  kbId: string
  docs: Awaited<ReturnType<typeof window.electron.knowledge.doc.list>>
  progressMap: Map<string, { progress: number; state: string }>
  onRefresh: () => void
}

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  ready: "default",
  failed: "destructive",
}

/** 文档管理 tab。 */
export function DocumentsTab({ kbId, docs, progressMap, onRefresh }: Props) {
  const { t } = useTranslation()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleDelete = async (docId: string) => {
    await window.electron.knowledge.doc.delete(docId)
    onRefresh()
  }

  const handleRetry = async (docId: string) => {
    await window.electron.knowledge.doc.retry(docId)
    onRefresh()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 justify-end">
        <UploadZone kbId={kbId} onUploaded={onRefresh} />
      </div>

      {docs.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t("knowledge.emptyDescription")}</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-0.5">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-lg border">
              <div
                className={`flex items-center justify-between p-3 ${doc.state === "ready" ? "hover:bg-muted/50 cursor-pointer" : ""}`}
                onClick={() => doc.state === "ready" && setExpandedId((prev) => (prev === doc.id ? null : doc.id))}
              >
                <div className="flex items-center gap-3">
                  {doc.state === "ready" ? (
                    <ChevronDown className={`text-muted-foreground size-4 transition-transform ${expandedId === doc.id ? "rotate-180" : ""}`} />
                  ) : (
                    <FileText className="text-muted-foreground size-4" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {doc.format.toUpperCase()} · {(doc.size / 1024).toFixed(1)} KB · {doc.chunk_count} chunks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {(doc.state === "processing" || progressMap.has(doc.id)) && (
                    <div className="flex items-center gap-2">
                      <Progress value={progressMap.get(doc.id)?.progress ?? 0} className="h-2 w-24" />
                      <span className="text-muted-foreground text-xs">{progressMap.get(doc.id)?.progress ?? 0}%</span>
                    </div>
                  )}
                  <Badge variant={STATE_VARIANT[doc.state] ?? "outline"}>{t(`knowledge.doc.${doc.state}`)}</Badge>
                  {doc.state === "failed" && (
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => handleRetry(doc.id)}>
                      <RotateCcw className="size-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {expandedId === doc.id && doc.state === "ready" && <ChunkList docId={doc.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
