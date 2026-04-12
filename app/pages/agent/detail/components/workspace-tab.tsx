import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useTranslation } from "react-i18next"
import { ShikiHighlighter, isInlineCode } from "react-shiki/web"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { languages } from "@codemirror/language-data"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import type { Components } from "react-markdown"
import type { AgentRow } from "@/types/agent"

interface Props {
  row: AgentRow
}

/** Shiki 双主题：CSS 变量切换由 markdown.css 的 .dark 选择器控制 */
const SHIKI_THEMES = { dark: "github-dark-default", light: "github-light-default" } as const

/**
 * react-markdown 组件映射：
 * - pre 透传，避免和 ShikiHighlighter 内部的 pre 形成嵌套
 * - code 区分行内与代码块，代码块交给 react-shiki 渲染
 */
const mdComponents: Components = {
  pre: ({ children }) => <>{children}</>,
  code({ node, className, children, ...props }) {
    const lang = /language-(\w+)/.exec(className ?? "")?.[1]
    if (!lang || (node && isInlineCode(node))) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
    return (
      <ShikiHighlighter as="div" language={lang} theme={SHIKI_THEMES} defaultColor={false}>
        {String(children).replace(/\n$/, "")}
      </ShikiHighlighter>
    )
  },
}

/**
 * 监听 documentElement 的 class 变化，返回当前已解析的 light/dark 主题。
 * theme="system" 时 use-theme-effect 会直接更新 class 不动 store，所以这里只能观察 DOM。
 */
function useResolvedTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"))
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return theme
}

/** Workspace 文件 Tab：左侧文件列表，右侧预览/编辑切换。 */
export function WorkspaceTab({ row }: Props) {
  const { t } = useTranslation()
  const resolvedTheme = useResolvedTheme()
  const [files, setFiles] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // CodeMirror 扩展：稳定引用避免触发编辑器内部状态重建
  const cmExtensions = useMemo(() => [markdown({ base: markdownLanguage, codeLanguages: languages }), EditorView.lineWrapping], [])

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
  const isMarkdown = selected?.endsWith(".md") ?? false

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
    // 最外层：flex row，吃父 TabsContent 的 flex 剩余空间；min-h-0 允许被裁剪
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-4 text-sm">
      {/* 左列：固定宽度文件列表，shrink-0 不被压缩 */}
      <ScrollArea className="border-border w-40 shrink-0 rounded-md border">
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

      {/* 右列：flex col，flex-1 吃剩余宽度，min-h-0/min-w-0 允许子项缩到 0 */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        {error && <div className="bg-destructive/10 text-destructive shrink-0 rounded-md px-3 py-2 text-xs">{error}</div>}

        {selected && (
          <div className="flex shrink-0 items-center justify-between gap-2">
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

        {/* 内容容器：relative 定位上下文，min-h-0 flex-1 拿剩余高度 */}
        <div className="border-border relative min-h-0 flex-1 overflow-hidden rounded-md border">
          {selected && !isEditing && (
            <ScrollArea className="h-full w-full">
              <div className="markdown-prose cursor-text p-4" onClick={() => setDraft(content)}>
                {isMarkdown ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <pre className="font-mono text-xs whitespace-pre-wrap">{content}</pre>
                )}
              </div>
            </ScrollArea>
          )}
          {selected && isEditing && (
            <CodeMirror
              className="absolute inset-0"
              value={draft ?? ""}
              height="100%"
              theme={resolvedTheme}
              extensions={cmExtensions}
              basicSetup={{ tabSize: 2, foldGutter: false, lineNumbers: false, highlightActiveLine: true, highlightActiveLineGutter: false }}
              onChange={(value) => setDraft(value)}
              editable={!saving}
            />
          )}
        </div>
      </div>
    </div>
  )
}
