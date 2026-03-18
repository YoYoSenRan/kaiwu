import { type NextRequest, NextResponse } from "next/server"
import { db, debates, phases } from "@kaiwu/db"
import { eq, asc } from "drizzle-orm"
import { apiHandler, apiError } from "@/lib/api-utils"
import { debateSpeechSchema } from "@/lib/schemas/debate-speech"
import { emitEvent } from "@kaiwu/domain"

/** GET /api/pipeline/phases/:phaseId/debates — 返回辩论记录（按轮次排序） */
export async function GET(_req: Request, { params }: { params: Promise<{ phaseId: string }> }): Promise<NextResponse> {
  const { phaseId } = await params

  const rows = await db.select().from(debates).where(eq(debates.phaseId, phaseId)).orderBy(asc(debates.round), asc(debates.createdAt))

  return NextResponse.json(rows)
}

/** POST /api/pipeline/phases/:phaseId/debates — 提交辩论发言 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ phaseId: string }> }): Promise<NextResponse> {
  const { phaseId } = await params
  const agentId = req.headers.get("X-Agent-Id")
  if (!agentId) return apiError("缺少 X-Agent-Id header", 401)

  return apiHandler(req, {
    schema: debateSpeechSchema,
    handler: async (body) => {
      // 查 phase 以获取 projectId
      const [phase] = await db.select({ projectId: phases.projectId }).from(phases).where(eq(phases.id, phaseId))
      if (!phase) return apiError("阶段不存在", 404)

      const [row] = await db
        .insert(debates)
        .values({ phaseId, agentId, round: body.round, stance: body.stance, content: body.content, citations: body.citations, keyPoint: body.keyPoint })
        .returning()

      await emitEvent({
        type: "debate_speech",
        title: `${body.stance === "support" ? "说客" : "诤臣"}第 ${body.round} 轮发言`,
        detail: { debateId: row?.id, stance: body.stance, keyPoint: body.keyPoint },
        projectId: phase.projectId,
        phaseId,
        agentId,
      })

      return NextResponse.json(row, { status: 201 })
    },
  })
}
