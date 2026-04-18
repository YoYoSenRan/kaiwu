/**
 * 极简的同步信号源:多 listener,emit 时同步广播。
 * 替代各处手写的 `Set<listener>` + `add` / `delete` / `for...of` 模板。
 */

export type Listener<T> = (value: T) => void

export class Signal<T> {
  private readonly listeners = new Set<Listener<T>>()

  /** 订阅,返回取消订阅函数。 */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** 同步广播给所有 listener。listener 抛错不影响其他 listener,由调用方自行 try-catch。 */
  emit(value: T): void {
    for (const fn of this.listeners) fn(value)
  }
}
