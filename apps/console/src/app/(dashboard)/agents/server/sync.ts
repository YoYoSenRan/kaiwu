import { db, agents } from "@kaiwu/db"
import { listAgents } from "@kaiwu/openclaw"
import { notInArray } from "drizzle-orm"

export interface AgentSyncResult {
  synced: number
  unsynced: number
}

/**
 * 从 openclaw.json 同步 Agent 列表到 DB
 */
export async function syncAgentsToDb(): Promise<AgentSyncResult> {
  const localAgents = await listAgents()

  if (localAgents.length === 0) {
    return { synced: 0, unsynced: 0 }
  }

  const localIds: string[] = []

  for (const agent of localAgents) {
    localIds.push(agent.id)

    await db
      .insert(agents)
      .values({
        id: agent.id,
        name: agent.name,
        stageType: "execute",
        model: agent.model,
        status: "offline",
        config: { allowAgents: agent.allowAgents, workspace: agent.workspace },
        isEnabled: agent.enabled,
      })
      .onConflictDoUpdate({
        target: agents.id,
        set: {
          name: agent.name,
          model: agent.model,
          config: { allowAgents: agent.allowAgents, workspace: agent.workspace },
          isEnabled: agent.enabled,
          status: "offline",
          updatedAt: new Date(),
        },
      })
  }

  const unsyncedResult = await db.update(agents).set({ status: "unsynced", updatedAt: new Date() }).where(notInArray(agents.id, localIds)).returning({ id: agents.id })

  return { synced: localIds.length, unsynced: unsyncedResult.length }
}
