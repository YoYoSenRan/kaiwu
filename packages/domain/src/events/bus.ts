/** 内存事件总线 — 进程内 pub/sub，SSE 端点订阅用 */

type EventPayload = { seq: number; type: string; title: string | null; detail: unknown; projectId: string | null; phaseId: string | null; agentId: string | null; createdAt: Date }

type Subscriber = (event: EventPayload) => void

const subscribers = new Set<Subscriber>()

/** 发布事件到所有订阅者 */
export function publish(event: EventPayload): void {
  for (const fn of subscribers) {
    try {
      fn(event)
    } catch {
      // subscriber 出错不影响其他订阅者
    }
  }
}

/** 订阅事件，返回取消订阅函数 */
export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export type { EventPayload, Subscriber }
