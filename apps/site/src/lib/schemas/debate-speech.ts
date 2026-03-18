import { z } from "zod"

/** 辩论发言 — 对应说客/诤臣 TOOLS.md 输出格式 */
export const debateSpeechSchema = z.object({
  round: z.number().int().min(1).max(4),
  stance: z.enum(["support", "oppose"]),
  content: z.string(),
  citations: z.array(z.object({ source: z.string(), data: z.string(), url: z.string().optional() })),
  keyPoint: z.string(),
})

export type DebateSpeech = z.infer<typeof debateSpeechSchema>
