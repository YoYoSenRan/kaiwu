import { z } from "zod"

/** 鸣锣报告 — 对应鸣锣 TOOLS.md 输出格式 */
export const deployReportSchema = z.object({
  verdict: z.enum(["launched", "rollback"]),
  productUrl: z.string(),
  repoUrl: z.string(),
  deployInfo: z.object({ platform: z.string(), buildTime: z.string(), deployId: z.string() }),
  smokeTest: z.object({ passed: z.boolean(), checks: z.array(z.object({ url: z.string(), status: z.number().int(), responseTime: z.string() })) }),
  monitoring: z.object({ uptimeUrl: z.string(), errorTrackingUrl: z.string() }),
  rollbackPlan: z.string(),
})

export type DeployReport = z.infer<typeof deployReportSchema>
