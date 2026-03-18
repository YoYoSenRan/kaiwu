/**
 * 数据访问层——读取操作
 *
 * Plugin 和编排层直接调用（不走 HTTP），Route Handler 也可复用。
 */
import { db, agents, agentStats, projects, phases, debates, tasks } from "@kaiwu/db"
import { eq, and, asc, desc } from "drizzle-orm"

/** 读取 Agent 属性面板 */
export async function getAgentStats(agentId: string) {
  const stats = await db.select().from(agentStats).where(eq(agentStats.agentId, agentId))
  return { agentId, stats }
}

/** 读取项目上下文 + 上游产出 */
export async function getProjectContext(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) return null

  const projectPhases = await db.select().from(phases).where(eq(phases.projectId, projectId)).orderBy(asc(phases.createdAt))

  const currentPhase = projectPhases.find((p) => p.status === "in_progress") ?? projectPhases.find((p) => p.status === "pending")
  const upstreamOutputs = projectPhases.filter((p) => p.status === "completed" && p.output).map((p) => ({ phaseId: p.id, type: p.type, output: p.output }))

  return { project, currentPhase: currentPhase ?? null, upstreamOutputs }
}

/** 读取辩论记录 */
export async function getDebateHistory(phaseId: string) {
  return db.select().from(debates).where(eq(debates.phaseId, phaseId)).orderBy(asc(debates.round), asc(debates.createdAt))
}

/** 读取任务列表 */
export async function getAgentTasks(projectId: string, agentId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.assignedAgent, agentId)))
}
