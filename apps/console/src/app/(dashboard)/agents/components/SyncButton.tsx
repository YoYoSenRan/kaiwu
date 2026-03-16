"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { syncAgentsAction } from "../server/actions"

export function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSync(): void {
    startTransition(async () => {
      const result = await syncAgentsAction()
      if (!result.success) {
        toast.error(result.error ?? "同步失败")
        return
      }

      toast.success(`同步完成：${result.synced} 个 Agent`)
      router.refresh()
    })
  }

  return (
    <button type="button" onClick={handleSync} disabled={isPending} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">
      {isPending ? "同步中..." : "同步本地配置"}
    </button>
  )
}
