import { z } from "zod"

/** 任务完成报告 — 对应匠人 completeTask 输出 */
export const taskCompleteSchema = z.object({ commits: z.array(z.string()).optional(), decisions: z.array(z.string()).optional(), note: z.string().optional() })

export type TaskComplete = z.infer<typeof taskCompleteSchema>
