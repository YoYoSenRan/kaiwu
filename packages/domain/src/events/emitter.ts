/** 写入 events 表 + 发布到内存总线 */
import { db, events } from "@kaiwu/db"
import { publish } from "./bus"
import type { EventPayload } from "./bus"

type EmitInput = { type: string; title?: string; detail?: unknown; projectId?: string; phaseId?: string; agentId?: string }

/** 写入数据库并广播到 EventBus */
export async function emitEvent(input: EmitInput): Promise<EventPayload> {
  const [row] = await db
    .insert(events)
    .values({
      type: input.type,
      title: input.title ?? null,
      detail: input.detail ?? null,
      projectId: input.projectId ?? null,
      phaseId: input.phaseId ?? null,
      agentId: input.agentId ?? null,
    })
    .returning()

  if (!row) throw new Error("Failed to insert event")

  const payload: EventPayload = {
    seq: row.seq,
    type: row.type,
    title: row.title ?? null,
    detail: row.detail,
    projectId: row.projectId,
    phaseId: row.phaseId,
    agentId: row.agentId,
    createdAt: row.createdAt,
  }

  publish(payload)
  return payload
}
