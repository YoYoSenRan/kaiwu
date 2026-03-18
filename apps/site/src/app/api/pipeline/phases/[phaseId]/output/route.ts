import { type NextRequest, NextResponse } from "next/server"
import { db, phases } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import type { ZodSchema } from "zod"
import { apiError } from "@/lib/api-utils"
import { emitEvent } from "@kaiwu/domain"
import { scoutReportSchema } from "@/lib/schemas/scout-report"
import { verdictSchema } from "@/lib/schemas/verdict"
import { blueprintSchema } from "@/lib/schemas/blueprint"
import { reviewSchema } from "@/lib/schemas/review"
import { deployReportSchema } from "@/lib/schemas/deploy-report"

/** 阶段类型 → 产出 Schema 映射（debate/build 走独立端点，不经过此处） */
const PHASE_OUTPUT_SCHEMAS: Record<string, ZodSchema> = {
  scout: scoutReportSchema,
  verdict: verdictSchema,
  blueprint: blueprintSchema,
  review: reviewSchema,
  deploy: deployReportSchema,
}

/** POST /api/pipeline/phases/:phaseId/output — 提交阶段产出（Zod 按类型校验 + 幂等 409） */
export async function POST(req: NextRequest, { params }: { params: Promise<{ phaseId: string }> }): Promise<NextResponse> {
  const { phaseId } = await params
  const agentId = req.headers.get("X-Agent-Id")

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return apiError("请求体不是合法 JSON", 400)
  }

  const [phase] = await db.select().from(phases).where(eq(phases.id, phaseId))
  if (!phase) return apiError("阶段不存在", 404)
  if (phase.output) return apiError("该阶段已有产出", 409)

  const schema = PHASE_OUTPUT_SCHEMAS[phase.type]
  if (!schema) return apiError(`未知的阶段类型: ${phase.type}`, 400)

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return apiError("产出格式校验失败", 400, parsed.error.flatten())

  try {
    const [updated] = await db.update(phases).set({ output: parsed.data, status: "completed", completedAt: new Date() }).where(eq(phases.id, phaseId)).returning()

    await emitEvent({ type: `${phase.type}_completed`, title: `${phase.type} 阶段产出已提交`, detail: parsed.data, projectId: phase.projectId, phaseId, agentId: agentId ?? undefined })

    return NextResponse.json(updated, { status: 201 })
  } catch (err) {
    console.error("[api]", err)
    return apiError("服务器内部错误", 500)
  }
}
