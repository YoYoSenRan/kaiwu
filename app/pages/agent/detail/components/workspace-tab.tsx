import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AgentRow } from "@/types/agent"

interface Props {
  row: AgentRow
}

/** Workspace 文件 Tab：左侧文件列表，右侧预览/编辑切换。 */
export function WorkspaceTab({ row }: Props) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.electron.agent.files
      .list(row.id)
      .then((list) => {
        setFiles(list)
        setSelected(list[0] ?? null)
      })
      .catch((e: Error) => setError(e.message))
  }, [row.id])

  useEffect(() => {
    if (!selected) return
    setDraft(null)
    setError(null)
    window.electron.agent.files
      .read(row.id, selected)
      .then(setContent)
      .catch((e: Error) => setError(e.message))
  }, [row.id, selected])

  const isEditing = draft !== null
  const isDirty = isEditing && draft !== content

  const save = async () => {
    if (draft === null) return
    setSaving(true)
    setError(null)
    try {
      await window.electron.agent.files.write(row.id, selected!, draft)
      setContent(draft)
      setDraft(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid h-full grid-cols-[160px_1fr] gap-3 p-4 text-sm">
      <ScrollArea className="border-border h-full rounded-md border">
        <nav className="p-1">
          {files.length === 0 && <div className="text-muted-foreground p-2 text-xs">{t("agent.workspace.empty")}</div>}
          {files.map((f) => (
            <button
              key={f}
              onClick={() => setSelected(f)}
              className={`hover:bg-muted w-full rounded-sm px-2 py-1.5 text-left font-mono text-xs ${selected === f ? "bg-muted font-medium" : ""}`}
            >
              {f}
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="flex min-h-0 flex-col">
        {error && <div className="bg-destructive/10 text-destructive mb-2 rounded-md px-3 py-2 text-xs">{error}</div>}

        {selected && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-mono text-xs">{selected}</span>
            {isEditing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDraft(null)} disabled={saving}>
                  {t("agent.workspace.cancel")}
                </Button>
                <Button size="sm" onClick={save} disabled={!isDirty || saving}>
                  {t("agent.workspace.save")}
                </Button>
              </div>
            ) : (
              <span className="text-muted-foreground text-[10px]">{t("agent.workspace.previewHint")}</span>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1">
          {selected && !isEditing && (
            <ScrollArea className="border-border h-full rounded-md border">
              <div className="prose prose-sm dark:prose-invert max-w-none cursor-text p-3" onClick={() => setDraft(content)}>
                {selected.endsWith(".md") ? <ReactMarkdown>{content}</ReactMarkdown> : <pre className="font-mono text-xs whitespace-pre-wrap">{content}</pre>}
              </div>
            </ScrollArea>
          )}
          {selected && isEditing && (
            <Textarea value={draft ?? ""} onChange={(e) => setDraft(e.target.value)} disabled={saving} className="h-full min-h-[300px] resize-none font-mono text-xs" />
          )}
        </div>
      </div>
    </div>
  )
}
