import { z } from "zod"

/** 裁决书 — 对应掌秤 TOOLS.md 输出格式 */
export const verdictSchema = z.object({
  verdict: z.enum(["approved", "rejected", "conditional"]),
  reason: z.string(),
  optimistPoints: z.array(z.string()),
  skepticPoints: z.array(z.string()),
  conditions: z.array(z.string()).optional(),
  epitaph: z.string().optional(),
})

export type Verdict = z.infer<typeof verdictSchema>
