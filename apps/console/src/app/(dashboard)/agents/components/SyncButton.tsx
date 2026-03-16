"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync(): Promise<void> {
    setSyncing(true)
    setMessage(null)

    try {
      const res = await fetch("/api/agents/sync", { method: "POST" })
      const data = await res.json()

      if (data.success) {
        setMessage(`同步完成：${data.synced} 个 Agent`)
        router.refresh()
      } else {
        setMessage(`同步失败：${data.error}`)
      }
    } catch {
      setMessage("网络错误")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={handleSync} disabled={syncing} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">
        {syncing ? "同步中..." : "同步本地配置"}
      </button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  )
}
