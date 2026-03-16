"use server"

import { revalidatePath } from "next/cache"
import { db, agents } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import { writeWorkspaceFile, updateAgentModel as ocUpdateModel, toggleAgentEnabled, restartGateway } from "@kaiwu/openclaw"
import { saveAgentFileSchema, toggleAgentSchema, updateAgentModelSchema } from "./schemas"
import { syncAgentsToDb, type AgentSyncResult } from "./sync"

interface ActionResult {
  success: boolean
  error?: string
}

interface SyncActionResult extends ActionResult, AgentSyncResult {}

function revalidateAgentPaths(agentId?: string): void {
  revalidatePath("/agents")
  if (agentId) {
    revalidatePath(`/agents/${agentId}`)
  }
}

export async function syncAgentsAction(): Promise<SyncActionResult> {
  try {
    const result = await syncAgentsToDb()
    revalidateAgentPaths()
    return { success: true, ...result }
  } catch (err) {
    const message = err instanceof Error ? err.message : "同步失败"
    return { success: false, synced: 0, unsynced: 0, error: message }
  }
}

export async function saveAgentFile(formData: FormData): Promise<ActionResult> {
  const parsed = saveAgentFileSchema.safeParse({ agentId: formData.get("agentId"), filename: formData.get("filename"), content: formData.get("content") })

  if (!parsed.success) {
    return { success: false, error: "参数校验失败" }
  }

  try {
    await writeWorkspaceFile(parsed.data.agentId, parsed.data.filename, parsed.data.content)
    revalidateAgentPaths(parsed.data.agentId)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "写入文件失败"
    return { success: false, error: message }
  }
}

export async function toggleAgent(formData: FormData): Promise<ActionResult> {
  const parsed = toggleAgentSchema.safeParse({ agentId: formData.get("agentId"), isEnabled: formData.get("isEnabled") === "true" })

  if (!parsed.success) {
    return { success: false, error: "参数校验失败" }
  }

  try {
    await toggleAgentEnabled(parsed.data.agentId, parsed.data.isEnabled)
    await db.update(agents).set({ isEnabled: parsed.data.isEnabled, updatedAt: new Date() }).where(eq(agents.id, parsed.data.agentId))
    revalidateAgentPaths(parsed.data.agentId)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败"
    return { success: false, error: message }
  }
}

export async function updateAgentModel(formData: FormData): Promise<ActionResult> {
  const parsed = updateAgentModelSchema.safeParse({ agentId: formData.get("agentId"), model: formData.get("model") })

  if (!parsed.success) {
    return { success: false, error: "参数校验失败" }
  }

  try {
    await ocUpdateModel(parsed.data.agentId, parsed.data.model)
    await db.update(agents).set({ model: parsed.data.model, updatedAt: new Date() }).where(eq(agents.id, parsed.data.agentId))
    revalidateAgentPaths(parsed.data.agentId)

    const restarted = await restartGateway()
    if (!restarted) {
      return { success: true, error: "配置已保存，但 Gateway 重启失败，需手动重启" }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败"
    return { success: false, error: message }
  }
}
