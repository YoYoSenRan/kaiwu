import { type NextRequest, NextResponse } from "next/server"
import { db, tasks } from "@kaiwu/db"
import { eq, and } from "drizzle-orm"

/** GET /api/pipeline/projects/:projectId/tasks — 返回任务列表（支持筛选） */
export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }): Promise<NextResponse> {
  const { projectId } = await params
  const { searchParams } = req.nextUrl
  const assignedTo = searchParams.get("assignedTo")
  const status = searchParams.get("status")

  const conditions = [eq(tasks.projectId, projectId)]
  if (assignedTo) conditions.push(eq(tasks.assignedAgent, assignedTo))
  if (status) conditions.push(eq(tasks.status, status))

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))

  return NextResponse.json(rows)
}
