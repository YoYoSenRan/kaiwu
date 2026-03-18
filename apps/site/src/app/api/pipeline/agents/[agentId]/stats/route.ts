import { NextResponse } from "next/server"
import { db, agentStats } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import { apiError } from "@/lib/api-utils"

/** GET /api/pipeline/agents/:agentId/stats — 返回 Agent 属性面板 */
export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }): Promise<NextResponse> {
  const { agentId } = await params

  const stats = await db.select().from(agentStats).where(eq(agentStats.agentId, agentId))

  if (stats.length === 0) {
    return apiError("Agent 不存在或无属性数据", 404)
  }

  return NextResponse.json({ agentId, stats })
}
