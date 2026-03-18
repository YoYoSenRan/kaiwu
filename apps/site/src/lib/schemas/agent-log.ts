import { z } from "zod"

/** Agent 日志 — writeLog 输入格式 */
export const agentLogSchema = z.object({
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  type: z.enum(["thought", "action", "decision", "error"]),
  content: z.string(),
  visibility: z.enum(["public", "internal"]).default("internal"),
})

export type AgentLog = z.infer<typeof agentLogSchema>
