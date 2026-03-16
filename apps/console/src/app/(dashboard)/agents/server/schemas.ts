import { z } from "zod"

export const saveAgentFileSchema = z.object({ agentId: z.string().min(1), filename: z.string().min(1), content: z.string() })

export const toggleAgentSchema = z.object({ agentId: z.string().min(1), isEnabled: z.boolean() })

export const updateAgentModelSchema = z.object({ agentId: z.string().min(1), model: z.string().min(1) })

export type SaveAgentFileInput = z.infer<typeof saveAgentFileSchema>
export type ToggleAgentInput = z.infer<typeof toggleAgentSchema>
export type UpdateAgentModelInput = z.infer<typeof updateAgentModelSchema>
