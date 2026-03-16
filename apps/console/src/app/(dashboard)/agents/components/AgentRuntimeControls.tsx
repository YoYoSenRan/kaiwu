"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { toggleAgent, updateAgentModel } from "../server/actions"

interface AgentRuntimeControlsProps {
  agentId: string
  model: string | null
  isEnabled: boolean
}

export function AgentRuntimeControls({ agentId, model, isEnabled }: AgentRuntimeControlsProps) {
  const router = useRouter()
  const [draftModel, setDraftModel] = useState(model ?? "")
  const [isPending, startTransition] = useTransition()

  function handleToggle(nextEnabled: boolean): void {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("agentId", agentId)
      formData.set("isEnabled", String(nextEnabled))

      const result = await toggleAgent(formData)
      if (!result.success) {
        toast.error(result.error ?? "更新失败")
        return
      }

      toast.success(nextEnabled ? "已启用 Agent" : "已禁用 Agent")
      router.refresh()
    })
  }

  function handleModelSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    startTransition(async () => {
      const nextModel = draftModel.trim()
      if (!nextModel) {
        toast.error("模型不能为空")
        return
      }

      const formData = new FormData()
      formData.set("agentId", agentId)
      formData.set("model", nextModel)

      const result = await updateAgentModel(formData)
      if (!result.success) {
        toast.error(result.error ?? "更新失败")
        return
      }

      toast.success("模型已更新")
      if (result.error) {
        toast.warning(result.error)
      }
      router.refresh()
    })
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">运行控制</h3>
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">启用状态</p>
            <p className="text-xs text-muted-foreground">禁用后不会从 OpenClaw 配置中移除，只是切换 enabled 标志。</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle(!isEnabled)}
            disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            {isPending ? "处理中..." : isEnabled ? "禁用 Agent" : "启用 Agent"}
          </button>
        </div>

        <form onSubmit={handleModelSubmit} className="space-y-3">
          <div>
            <label htmlFor="agent-model" className="mb-1 block text-sm font-medium">
              模型
            </label>
            <input
              id="agent-model"
              value={draftModel}
              onChange={(event) => setDraftModel(event.target.value)}
              placeholder="例如: openai/gpt-5"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">保存后会写回 openclaw.json，并尝试自动重启 Gateway。</p>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? "保存中..." : "更新模型"}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
