import { NextResponse } from "next/server"
import { db, projects, phases } from "@kaiwu/db"
import { eq, asc } from "drizzle-orm"
import { apiError } from "@/lib/api-utils"

/** GET /api/pipeline/projects/:projectId/context — 返回项目上下文 + 上游产出 */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }): Promise<NextResponse> {
  const { projectId } = await params

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

  if (!project) {
    return apiError("造物令不存在", 404)
  }

  const projectPhases = await db.select().from(phases).where(eq(phases.projectId, projectId)).orderBy(asc(phases.createdAt))

  const currentPhase = projectPhases.find((p) => p.status === "in_progress")
  const upstreamOutputs = projectPhases.filter((p) => p.status === "completed" && p.output).map((p) => ({ phaseId: p.id, type: p.type, output: p.output }))

  return NextResponse.json({ project, currentPhase: currentPhase ?? null, upstreamOutputs })
}
