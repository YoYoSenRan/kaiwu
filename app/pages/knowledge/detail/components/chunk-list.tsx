import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"

interface Props {
  docId: string
}

/** 文档分块内容列表，展开时懒加载。 */
export function ChunkList({ docId }: Props) {
  const { t } = useTranslation()
  const [chunks, setChunks] = useState<Awaited<ReturnType<typeof window.electron.knowledge.doc.chunks>>>([])
  const [loading, setLoading] = useState(true)
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const data = await window.electron.knowledge.doc.chunks(docId)
        setChunks(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [docId])

  if (loading) return <p className="text-muted-foreground py-4 text-center text-xs">{t("common.loading") ?? "加载中..."}</p>
  if (chunks.length === 0) return <p className="text-muted-foreground py-4 text-center text-xs">{t("knowledge.doc.noChunks")}</p>

  return (
    <div className="border-t">
      <div className="space-y-2 p-3">
        {chunks.map((chunk) => (
          <div
            key={chunk.id}
            className="bg-muted/50 hover:bg-muted cursor-pointer rounded-md p-3 transition-colors"
            onClick={() => setExpandedChunk((prev) => (prev === chunk.id ? null : chunk.id))}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">{t("knowledge.doc.chunkPosition", { position: chunk.position + 1 })}</span>
              <Badge variant="outline">{t("knowledge.doc.chunkCount", { count: chunk.content.length })}</Badge>
            </div>
            <p className={`text-xs whitespace-pre-wrap ${expandedChunk === chunk.id ? "" : "line-clamp-3"}`}>{chunk.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
