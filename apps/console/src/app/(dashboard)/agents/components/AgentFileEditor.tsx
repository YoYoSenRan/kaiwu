"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { request } from "@/lib/request"

interface AgentFileEditorProps {
  agentId: string
  filename: string
  label: string
  onClose: () => void
}

export function AgentFileEditor({ agentId, filename, label, onClose }: AgentFileEditorProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const data = await request<{ content: string }>(`/api/agents/${agentId}/workspace/${encodeURIComponent(filename)}`)
      setContent(data.content ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [agentId, filename])

  useEffect(() => {
    loadFile()
  }, [loadFile])

  async function handleSave(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      await request(`/api/agents/${agentId}/workspace/${encodeURIComponent(filename)}`, { method: "PUT", body: JSON.stringify({ content }) })
      toast.success("保存成功")
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败"
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-4 text-center text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="h-64 w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={`${label} 内容为空`}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  )
}
