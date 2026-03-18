import { type NextRequest, NextResponse } from "next/server"
import { db, tasks } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import { apiHandler, apiError } from "@/lib/api-utils"
import { taskCompleteSchema } from "@/lib/schemas/task-complete"
import { emitEvent } from "@kaiwu/domain"

/** POST /api/pipeline/tasks/:taskId/complete — 提交任务完成 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }): Promise<NextResponse> {
  const { taskId } = await params
  const agentId = req.headers.get("X-Agent-Id")

  return apiHandler(req, {
    schema: taskCompleteSchema,
    handler: async (body) => {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
      if (!task) return apiError("任务不存在", 404)
      if (agentId && task.assignedAgent && task.assignedAgent !== agentId) {
        return apiError("无权完成此任务：调用者与 assignedAgent 不匹配", 403)
      }

      const [updated] = await db.update(tasks).set({ status: "completed", result: body, completedAt: new Date() }).where(eq(tasks.id, taskId)).returning()

      await emitEvent({
        type: "task_completed",
        title: `任务完成: ${task.title}`,
        detail: { taskId, result: body },
        projectId: task.projectId,
        phaseId: task.phaseId ?? undefined,
        agentId: agentId ?? undefined,
      })

      return NextResponse.json(updated, { status: 200 })
    },
  })
}
