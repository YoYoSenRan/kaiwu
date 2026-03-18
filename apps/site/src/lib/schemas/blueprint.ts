import { z } from "zod"

/** 造物蓝图 — 对应画师 TOOLS.md 输出格式 */
export const blueprintSchema = z.object({
  positioning: z.object({ oneLiner: z.string(), sellingPoints: z.array(z.string()), targetAudience: z.string() }),
  pageStructure: z.array(z.object({ section: z.string(), title: z.string(), content: z.string(), layout: z.string(), visual: z.string(), interaction: z.string() })),
  visualDirection: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    backgroundColor: z.string(),
    fontHeading: z.string(),
    fontBody: z.string(),
    styleKeywords: z.array(z.string()),
    references: z.array(z.string()),
  }),
  signature: z.string(),
  tasks: z.array(
    z.object({
      id: z.string(),
      section: z.string(),
      title: z.string(),
      structure: z.string(),
      content: z.string(),
      visual: z.string(),
      interaction: z.string(),
      assignTo: z.string(),
      dependsOn: z.array(z.string()),
      priority: z.number().int(),
    })
  ),
})

export type Blueprint = z.infer<typeof blueprintSchema>
