import { Library, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  agentId: string
}

/** Agent 知识库绑定管理。 */
export function KnowledgeTab({ agentId }: Props) {
  const { t } = useTranslation()
  const [bindings, setBindings] = useState<Awaited<ReturnType<typeof window.electron.knowledge.bind.list>>>([])
  const [allKbs, setAllKbs] = useState<Awaited<ReturnType<typeof window.electron.knowledge.base.list>>>([])
  const [selectOpen, setSelectOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    const data = await window.electron.knowledge.bind.list(agentId)
    setBindings(data)
  }, [agentId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载，与 useAgentDetail 同模式
    void refresh()
  }, [refresh])

  const openSelectDialog = async () => {
    const kbs = await window.electron.knowledge.base.list()
    setAllKbs(kbs)
    setSelected(new Set(bindings.map((b) => b.id)))
    setSelectOpen(true)
  }

  const handleSave = async () => {
    await window.electron.knowledge.bind.set(agentId, Array.from(selected))
    setSelectOpen(false)
    void refresh()
  }

  const toggleKb = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("knowledge.bind.title")}</h3>
        <Button size="sm" variant="outline" onClick={openSelectDialog}>
          <Plus className="mr-1.5 size-3.5" />
          {t("knowledge.bind.select")}
        </Button>
      </div>

      {bindings.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">{t("knowledge.bind.empty")}</p>
      ) : (
        <div className="space-y-2">
          {bindings.map((kb) => (
            <div key={kb.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Library className="text-muted-foreground size-4" />
                <span className="text-sm">{kb.name}</span>
                <Badge variant="outline" className="text-xs">{kb.doc_count} docs</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={selectOpen} onOpenChange={setSelectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("knowledge.bind.select")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {allKbs.map((kb) => (
              <label key={kb.id} className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                <Checkbox checked={selected.has(kb.id)} onCheckedChange={() => toggleKb(kb.id)} />
                <div>
                  <p className="text-sm font-medium">{kb.name}</p>
                  <p className="text-muted-foreground text-xs">{kb.doc_count} docs · {kb.chunk_count} chunks</p>
                </div>
              </label>
            ))}
          </div>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
