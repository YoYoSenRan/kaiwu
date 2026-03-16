"use server"

import { NextResponse } from "next/server"
import { db, agents } from "@kaiwu/db"
import { listAgents } from "@kaiwu/openclaw"
import { notInArray } from "drizzle-orm"

/**
 * POST /api/agents/sync
 * 从 openclaw.json 同步 Agent 列表到 DB
 * - 本地存在的 Agent → upsert 到 DB
 * - DB 中有但本地不存在的 → 标记 status = "unsynced"
 */
export async function POST(): Promise<NextResponse> {
  try {
    const localAgents = await listAgents()

    if (localAgents.length === 0) {
      return NextResponse.json({ success: true, synced: 0, unsynced: 0, message: "openclaw.json 中没有 Agent 配置" })
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

    return NextResponse.json({ success: true, synced: localIds.length, unsynced: unsyncedResult.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "同步失败"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
