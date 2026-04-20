import { Eye, FileText, FolderOpen, Lock, Pencil, Save } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import CodeMirror from "@uiw/react-codemirror"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettingsStore } from "@/stores/settings"
import type { AgentDetail } from "@contracts/agent"

type ViewMode = "preview" | "edit"

interface Props {
  detail: AgentDetail
  onRefresh: () => void
}

export function WorkspaceTab({ detail, onRefresh }: Props) {
  const { t } = useTranslation()
  const files = detail.files?.files ?? []
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [original, setOriginal] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<ViewMode>("preview")

  const themeSetting = useSettingsStore((s) => s.theme)
  const isDark = useMemo(() => {
    if (themeSetting === "dark") return true
    if (themeSetting === "light") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }, [themeSetting])

  const mdExtensions = useMemo(() => [markdown({ base: markdownLanguage, codeLanguages: languages })], [])

  const selectedFile = selected !== null ? files.find((f) => f.name === selected) : undefined
  const dirty = selected !== null && content !== original
  const editable = selectedFile?.writable === true

  const loadFile = async (name: string) => {
    setSelected(name)
    setMode("preview")
    setLoading(true)
    try {
      const res = await window.electron.agent.filesGet({ agentId: detail.agentId, name })
      setContent(res.content)
      setOriginal(res.content)
    } catch (err) {
      toast.error((err as Error).message)
      setContent("")
      setOriginal("")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await window.electron.agent.filesSet({ agentId: detail.agentId, name: selected, content })
      setOriginal(content)
      toast.success(t("agent.toast.fileSave.success", { filename: selected }))
      onRefresh()
    } catch (err) {
      toast.error(t("agent.toast.fileSave.error", { msg: (err as Error).message }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_1fr] gap-4">
      <Card className="min-h-0 overflow-hidden" size="sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FolderOpen className="text-muted-foreground size-4" />
            Workspace 文件
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto py-0">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="text-muted-foreground/40 mb-2 size-8" />
              <p className="text-muted-foreground text-xs">{t("common.noData")}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {files.map((f) => {
                const active = f.name === selected
                return (
                  <button
                    key={f.name}
                    onClick={() => loadFile(f.name)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-muted/70"}`}
                  >
                    {f.writable ? <FileText className="size-3.5 shrink-0" /> : <Lock className="text-muted-foreground size-3.5 shrink-0" />}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium">{f.name}</span>
                      {(f.size !== undefined || f.mtime) && (
                        <span className="text-muted-foreground/70 text-[10px]">
                          {f.size !== undefined ? `${f.size}B` : ""}
                          {f.mtime ? ` · ${new Date(f.mtime).toLocaleString()}` : ""}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-h-0 min-w-0 overflow-hidden" size="sm">
        {selected === null ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <FileText className="text-muted-foreground/40 mb-3 size-10" />
            <p className="text-muted-foreground text-sm">{t("agent.workspace.selectFile")}</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-border/50 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{selected}</span>
                {!editable && <Badge variant="secondary">{t("agent.workspace.readonly")}</Badge>}
                {dirty && editable && <Badge>{t("agent.workspace.dirty")}</Badge>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="bg-muted ring-foreground/10 flex rounded-md p-0.5 ring-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMode("preview")}
                    className={`h-7 gap-1 px-2 text-xs ${mode === "preview" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  >
                    <Eye className="size-3.5" />
                    <span>{t("agent.workspace.preview")}</span>
                  </Button>
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode("edit")}
                      className={`h-7 gap-1 px-2 text-xs ${mode === "edit" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                    >
                      <Pencil className="size-3.5" />
                      <span>{t("agent.workspace.edit")}</span>
                    </Button>
                  )}
                </div>
                {editable && mode === "edit" && (
                  <Button size="sm" variant="ghost" onClick={handleSave} disabled={!dirty || saving} className="h-7 gap-1 px-2 text-xs">
                    <Save className="size-3.5" />
                    <span>{t("agent.workspace.save")}</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {loading ? (
                <p className="text-muted-foreground py-6 text-center text-sm">{t("common.loading")}</p>
              ) : mode === "preview" ? (
                <div className="markdown-prose h-full overflow-y-auto px-5 py-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full overflow-hidden">
                  <CodeMirror
                    value={content}
                    onChange={setContent}
                    extensions={mdExtensions}
                    theme={isDark ? "dark" : "light"}
                    height="100%"
                    style={{ height: "100%" }}
                    readOnly={!editable}
                    basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: true, highlightActiveLineGutter: false }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
