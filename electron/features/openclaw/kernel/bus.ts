/**
 * 类型化事件总线。
 *
 * 主进程内的 pub/sub,与 Electron IPC 解耦。消费者在同进程内订阅领域事件,
 * renderer 推送由 events/publisher.ts 单独路由(订阅 bus,fan out 到 IPC channel)。
 *
 * 设计取舍:
 * - 同步派发(emit 调用栈内 listener 执行完才返回),避免异步事件风暴和时序困惑。
 * - listener 抛错仅 logger.warn,不中断其他 listener;事件总线不吞业务错误但也不级联崩溃。
 * - 返回 Unlisten 闭包,避免 off(event, listener) 引用相等性陷阱。
 */

import { scope } from "../../../infra/logger"

const log = scope("openclaw:bus")

export type Unlisten = () => void

type AnyListener = (data: unknown) => void

export class Bus<M extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof M, Set<AnyListener>>()

  /**
   * 订阅事件。返回取消订阅闭包。
   * 同一 listener 重复订阅视为一次(Set 去重)。
   */
  on<K extends keyof M>(event: K, listener: (data: M[K]) => void): Unlisten {
    const set = this.listeners.get(event) ?? new Set<AnyListener>()
    set.add(listener as AnyListener)
    this.listeners.set(event, set)
    return () => {
      set.delete(listener as AnyListener)
    }
  }

  /**
   * 发射事件。listener 同步调用,个别抛错不影响其他 listener。
   */
  emit<K extends keyof M>(event: K, data: M[K]): void {
    const set = this.listeners.get(event)
    if (!set || set.size === 0) return
    for (const fn of set) {
      try {
        fn(data)
      } catch (err) {
        log.warn(`listener for ${String(event)} threw: ${(err as Error).message}`)
      }
    }
  }

  /** 当前订阅者数量,用于诊断。 */
  size<K extends keyof M>(event: K): number {
    return this.listeners.get(event)?.size ?? 0
  }
}
