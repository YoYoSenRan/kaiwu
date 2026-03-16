import { db, agents, type Agent } from "@kaiwu/db"
import { eq } from "drizzle-orm"

/**
 * 获取所有 Agent 列表
 */
export async function getAgents(): Promise<Agent[]> {
  return db.select().from(agents).orderBy(agents.id)
}

/**
 * 获取单个 Agent
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1)
  return result[0] ?? null
}
