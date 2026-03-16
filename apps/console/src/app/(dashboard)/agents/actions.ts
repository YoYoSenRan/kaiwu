"use server"

import { z } from "zod"
import { writeWorkspaceFile, updateAgentModel as ocUpdateModel, toggleAgentEnabled, restartGateway } from "@kaiwu/openclaw"

const SaveFileSchema = z.object({ agentId: z.string().min(1), filename: z.string().min(1), content: z.string() })

const ToggleAgentSchema = z.object({ agentId: z.string().min(1), isEnabled: z.boolean() })

const UpdateModelSchema = z.object({ agentId: z.string().min(1), model: z.string().min(1) })

export async function saveAgentFile(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const parsed = SaveFileSchema.safeParse({ agentId: formData.get("agentId"), filename: formData.get("filename"), content: formData.get("content") })

  if (!parsed.success) {
    return { success: false, error: "参数校验失败" }
  }

  try {
    await writeWorkspaceFile(parsed.data.agentId, parsed.data.filename, parsed.data.content)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "写入文件失败"
    return { success: false, error: message }
  }
}

export async function toggleAgent(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const parsed = ToggleAgentSchema.safeParse({ agentId: formData.get("agentId"), isEnabled: formData.get("isEnabled") === "true" })

  if (!parsed.success) {
    return { success: false, error: "参数校验失败" }
  }

  try {
    await toggleAgentEnabled(parsed.data.agentId, parsed.data.isEnabled)
    // TODO: 同步更新 DB agents.is_enabled + revalidatePath
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败"
    return { success: false, error: message }
  }
}

export async function updateAgentModel(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdateModelSchema.safeParse({ agentId: formData.get("agentId"), model: formData.get("model") })

  if (!parsed.success) {
    return { success: false, error: "参数校验失败" }
  }

  try {
    await ocUpdateModel(parsed.data.agentId, parsed.data.model)
    const restarted = await restartGateway()
    if (!restarted) {
      return { success: true, error: "配置已保存，但 Gateway 重启失败，需手动重启" }
    }
    // TODO: 同步更新 DB agents.model + revalidatePath
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败"
    return { success: false, error: message }
  }
}
