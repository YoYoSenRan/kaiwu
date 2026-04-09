/**
 * 阶段上下文的内存存储。
 *
 * 生命周期跟随 OpenClaw gateway 进程。kaiwu 主进程在每次阶段切换时通过
 * invokePlugin 重新推送，gateway 重启后 kaiwu 也会重建连接并重推，
 * 因此不需要持久化。
 */

import type { StageContext } from "./contract.js"

const store = new Map<string, StageContext>()

/**
 * 写入或覆盖指定 session 的阶段上下文。
 * @param sessionKey 目标会话标识
 * @param ctx 阶段上下文
 */
export function setStageContext(sessionKey: string, ctx: StageContext): void {
  store.set(sessionKey, ctx)
}

/**
 * 读取指定 session 的阶段上下文。
 * @param sessionKey 目标会话标识
 */
export function getStageContext(sessionKey: string): StageContext | undefined {
  return store.get(sessionKey)
}

/**
 * 判断指定 session 是否存在阶段上下文。
 * @param sessionKey 目标会话标识
 */
export function hasStageContext(sessionKey: string): boolean {
  return store.has(sessionKey)
}

/**
 * 清除指定 session 的阶段上下文。
 * @param sessionKey 目标会话标识
 */
export function clearStageContext(sessionKey: string): void {
  store.delete(sessionKey)
}
