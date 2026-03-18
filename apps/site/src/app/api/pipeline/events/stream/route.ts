import { type NextRequest } from "next/server"
import { db, events } from "@kaiwu/db"
import { eq, gt } from "drizzle-orm"
import { asc } from "drizzle-orm"
import { subscribe } from "@kaiwu/domain"

/** 5 分钟超时阈值（毫秒） */
const RECONNECT_TIMEOUT_MS = 5 * 60 * 1000

/** GET /api/pipeline/events/stream — SSE 实时推送 */
export async function GET(req: NextRequest): Promise<Response> {
  const lastEventId = req.headers.get("Last-Event-ID")

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const send = (id: number, data: unknown): void => {
        controller.enqueue(encoder.encode(`id: ${id}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // 断线恢复：补推缺失事件（5 分钟内）
      if (lastEventId) {
        const seq = Number.parseInt(lastEventId, 10)
        if (!Number.isNaN(seq)) {
          // 查断线时刻（lastEventId 对应事件的创建时间），而非新事件时间
          const [disconnectedAt] = await db.select({ createdAt: events.createdAt }).from(events).where(eq(events.seq, seq))
          const isStale = !disconnectedAt || Date.now() - disconnectedAt.createdAt.getTime() > RECONNECT_TIMEOUT_MS

          if (!isStale) {
            const missed = await db.select().from(events).where(gt(events.seq, seq)).orderBy(asc(events.seq))

            for (const row of missed) {
              send(row.seq, {
                type: row.type,
                title: row.title,
                detail: row.detail,
                projectId: row.projectId,
                phaseId: row.phaseId,
                agentId: row.agentId,
                createdAt: row.createdAt,
              })
            }
          }
        }
      }

      // 订阅实时事件
      const unsubscribe = subscribe((event) => {
        send(event.seq, event)
      })

      // 心跳保活（每 30 秒）
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"))
      }, 30_000)

      // 客户端断开时清理
      req.signal.addEventListener("abort", () => {
        unsubscribe()
        clearInterval(heartbeat)
        controller.close()
      })
    },
  })

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } })
}
