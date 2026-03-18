import { z } from "zod"

/** 试剑报告 — 对应试剑 TOOLS.md 输出格式 */
export const reviewSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  issues: z.array(
    z.object({
      severity: z.enum(["critical", "warning", "info"]),
      category: z.enum(["code", "security", "performance", "function", "ux"]),
      description: z.string(),
      location: z.string(),
      suggestion: z.string(),
    }),
  ),
  summary: z.object({
    critical: z.number().int().min(0),
    warning: z.number().int().min(0),
    info: z.number().int().min(0),
  }),
})

export type Review = z.infer<typeof reviewSchema>
