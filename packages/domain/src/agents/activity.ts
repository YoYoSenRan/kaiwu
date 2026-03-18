/**
 * Agent 活动描述更新——更新 agents 表的 status/activity/activity_detail
 */
import { db, agents } from "@kaiwu/db"
import { eq } from "drizzle-orm"

interface UpdateActivityOptions {
  agentId: string
  status: string
  activity: string
  activityDetail?: unknown
  currentProject?: string | null
}

/** 更新 Agent 活动状态 */
export async function updateActivity(opts: UpdateActivityOptions): Promise<void> {
  await db
    .update(agents)
    .set({ status: opts.status, activity: opts.activity, activityDetail: opts.activityDetail ?? null, currentProject: opts.currentProject ?? undefined, updatedAt: new Date() })
    .where(eq(agents.id, opts.agentId))
}

/** 标记 Agent 为工作中 */
export async function markWorking(agentId: string, activity: string, projectId?: string): Promise<void> {
  await updateActivity({ agentId, status: "working", activity, currentProject: projectId })
}

/** 标记 Agent 为空闲 */
export async function markIdle(agentId: string): Promise<void> {
  await updateActivity({ agentId, status: "idle", activity: "在坊间闲逛", currentProject: null })
}
