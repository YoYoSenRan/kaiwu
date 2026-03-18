import { z } from "zod"

/** 采风报告 — 对应游商 TOOLS.md 输出格式 */
export const scoutReportSchema = z.object({
  keyword: z.string(),
  reason: z.string(),
  background: z.object({
    positioning: z.string(),
    targetUser: z.string(),
    corePainPoint: z.string(),
    productForm: z.string(),
    coreFeatures: z.array(z.string()),
    differentiation: z.string(),
  }),
  dimensions: z.object({
    market: z.object({ score: z.number().min(0).max(100), summary: z.string(), data: z.object({ marketSize: z.string(), trend: z.string(), competitors: z.array(z.string()) }) }),
    userNeed: z.object({
      score: z.number().min(0).max(100),
      summary: z.string(),
      data: z.object({ painPointValidation: z.string(), frequency: z.string(), willingness: z.string() }),
    }),
    differentiation: z.object({ score: z.number().min(0).max(100), summary: z.string(), data: z.object({ competitorWeaknesses: z.array(z.string()), entryAngle: z.string() }) }),
    showcasePotential: z.object({
      score: z.number().min(0).max(100),
      summary: z.string(),
      data: z.object({ visualStyle: z.string(), interactionIdea: z.string(), references: z.array(z.string()) }),
    }),
  }),
  overallScore: z.number().min(0).max(100),
  verdict: z.enum(["green", "yellow", "red"]),
  privateNote: z.string().optional(),
})

export type ScoutReport = z.infer<typeof scoutReportSchema>
