/**
 * Gateway 事件分发层。
 * 职责：监听 event 帧，提供通用的按名称订阅和按 key 定向分发。
 * 加新事件类型只需 registerKeyExtractor，不改分发逻辑（开闭原则）。
 */

import type { GatewaySocket } from "./socket"
import type { EventFrame } from "./contract"

type EventListener = (frame: EventFrame) => void
type KeyedListener = (payload: unknown) => void
type KeyExtractor = (payload: unknown) => string | undefined

/**
 * 事件路由器。
 * - on(eventName, listener)：按事件名订阅
 * - subscribe(eventName, key, listener)：按事件名 + key 定向订阅
 * - registerKeyExtractor(eventName, fn)：注册 key 提取函数（扩展点）
 */
export class EventEmitter {
  /** 按事件名的广播订阅。 */
  private readonly byName = new Map<string, Set<EventListener>>()
  /** 全量广播（不过滤事件名）。 */
  private readonly allListeners = new Set<EventListener>()
  /** 按事件名 + key 的定向订阅。 */
  private readonly byKey = new Map<string, Map<string, Set<KeyedListener>>>()
  /** 从 payload 中提取路由 key 的函数。 */
  private readonly extractors = new Map<string, KeyExtractor>()

  constructor(socket: GatewaySocket) {
    socket.frames.subscribe((frame) => {
      if (frame.type === "event") this.dispatch(frame as EventFrame)
    })
  }

  /**
   * 注册 key 提取函数。加新事件类型的定向分发只需调这个方法，不改 emitter 代码。
   * @param eventName 事件名（如 "chat"、"agent"）
   * @param extractor 从 payload 中提取路由 key 的函数
   */
  registerKeyExtractor(eventName: string, extractor: KeyExtractor): void {
    this.extractors.set(eventName, extractor)
  }

  /**
   * 订阅所有事件（不过滤名称）。
   * @param listener 事件帧回调
   */
  onAny(listener: EventListener): () => void {
    this.allListeners.add(listener)
    return () => this.allListeners.delete(listener)
  }

  /**
   * 按事件名订阅。
   * @param eventName 事件名
   * @param listener 事件帧回调
   */
  on(eventName: string, listener: EventListener): () => void {
    let set = this.byName.get(eventName)
    if (!set) {
      set = new Set()
      this.byName.set(eventName, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0) this.byName.delete(eventName)
    }
  }

  /**
   * 按事件名 + key 定向订阅。需要先 registerKeyExtractor 注册 key 提取逻辑。
   * @param eventName 事件名
   * @param key 路由键（如 sessionKey、agentId）
   * @param listener payload 回调
   */
  subscribe(eventName: string, key: string, listener: KeyedListener): () => void {
    let eventMap = this.byKey.get(eventName)
    if (!eventMap) {
      eventMap = new Map()
      this.byKey.set(eventName, eventMap)
    }
    let set = eventMap.get(key)
    if (!set) {
      set = new Set()
      eventMap.set(key, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0) eventMap!.delete(key)
      if (eventMap!.size === 0) this.byKey.delete(eventName)
    }
  }

  private dispatch(frame: EventFrame): void {
    // 全量广播
    for (const fn of this.allListeners) fn(frame)

    // 按名称广播
    const nameSet = this.byName.get(frame.event)
    if (nameSet) {
      for (const fn of nameSet) fn(frame)
    }

    // 按 key 定向分发
    const extractor = this.extractors.get(frame.event)
    if (extractor && frame.payload) {
      const key = extractor(frame.payload)
      if (key) {
        const keyMap = this.byKey.get(frame.event)
        const keySet = keyMap?.get(key)
        if (keySet) {
          for (const fn of keySet) fn(frame.payload)
        }
      }
    }
  }
}
