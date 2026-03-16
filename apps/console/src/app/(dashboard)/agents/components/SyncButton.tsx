"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { request } from "@/lib/request"

interface SyncData {
  synced: number
  unsynced: number
}

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  async function handleSync(): Promise<void> {
    setSyncing(true)

    try {
      const data = await request<SyncData>("/api/agents/sync", { method: "POST" })
      toast.success(`同步完成：${data.synced} 个 Agent`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "同步失败")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <button type="button" onClick={handleSync} disabled={syncing} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">
      {syncing ? "同步中..." : "同步本地配置"}
    </button>
  )
}
