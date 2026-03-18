import { type NextRequest, NextResponse } from "next/server"
import { db, agentLogs } from "@kaiwu/db"
import { apiHandler } from "@/lib/api-utils"
import { agentLogSchema } from "@/lib/schemas/agent-log"

/** POST /api/pipeline/agents/:agentId/logs — 写入 Agent 日志 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }): Promise<NextResponse> {
  const { agentId } = await params

  return apiHandler(req, {
    schema: agentLogSchema,
    handler: async (body) => {
      const [row] = await db
        .insert(agentLogs)
        .values({ agentId, projectId: body.projectId, phaseId: body.phaseId ?? null, type: body.type, content: body.content, visibility: body.visibility })
        .returning()

      return NextResponse.json(row, { status: 201 })
    },
  })
}
