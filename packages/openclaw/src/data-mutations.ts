/**
 * 数据访问层——写入操作（纯 DB，不发事件）
 *
 * Plugin tool 和 Route Handler 都可复用。
 * 事件发送由调用方负责（Plugin 在 execute 中发，Route Handler 在 handler 中发）。
 */
import { db, phases, debates, tasks, agentLogs } from "@kaiwu/db"
import { eq } from "drizzle-orm"

/** 提交阶段产出（幂等——已有产出返回 null） */
export async function submitPhaseOutput(phaseId: string, output: unknown) {
  const [phase] = await db.select().from(phases).where(eq(phases.id, phaseId))
  if (!phase) throw new Error("阶段不存在")
  if (phase.output) return null

  const [updated] = await db.update(phases).set({ output, completedAt: new Date(), updatedAt: new Date() }).where(eq(phases.id, phaseId)).returning()
  return updated
}

/** 提交辩论发言 */
export async function insertDebateSpeech(
  phaseId: string,
  agentId: string,
  speech: { round: number; stance: string; content: string; citations: unknown; keyPoint: string },
) {
  const [row] = await db
    .insert(debates)
    .values({ phaseId, agentId, round: speech.round, stance: speech.stance, content: speech.content, citations: speech.citations, keyPoint: speech.keyPoint })
    .returning()
  return row
}

/** 完成任务 */
export async function completeTaskInDb(taskId: string, agentId: string, result: { commits?: string[]; decisions?: string[]; note?: string }) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
  if (!task) throw new Error("任务不存在")
  if (agentId && task.assignedAgent && task.assignedAgent !== agentId) {
    throw new Error("无权完成此任务：调用者与 assignedAgent 不匹配")
  }

  const [updated] = await db.update(tasks).set({ status: "completed", result, completedAt: new Date() }).where(eq(tasks.id, taskId)).returning()
  return updated
}

/** 写入 Agent 日志 */
export async function insertAgentLog(
  agentId: string,
  log: { projectId: string; phaseId?: string; type: string; content: string; visibility?: string },
) {
  const [row] = await db
    .insert(agentLogs)
    .values({ agentId, projectId: log.projectId, phaseId: log.phaseId ?? null, type: log.type, content: log.content, visibility: log.visibility ?? "internal" })
    .returning()
  return row
}
