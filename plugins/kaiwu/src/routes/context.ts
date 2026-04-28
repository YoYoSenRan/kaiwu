/**
 * `context.set` / `context.clear` HTTP action — 控制端通过 HTTP 路由调用,
 * 写入/清空 stage 内存 store。后续每轮 agent 推理时 `hooks/prompt` 读取并注入上下文。
 */

import type { SharedHistoryEntry } from "./stage.js"
import { clearStageContext, setStageContext } from "./stage.js"

/** `context.set` params。 */
export interface ContextSetParams {
  sessionKey: string
  instruction: string
  knowledge: string[]
  sharedHistory?: SharedHistoryEntry[]
}

/** `context.clear` params。 */
export interface ContextClearParams {
  sessionKey: string
}

/** action = "context.set"。写入或覆盖阶段上下文。 */
export function handleContextSet(params: unknown): { ok: boolean; error?: string } {
  const p = params as ContextSetParams | undefined
  if (!p?.sessionKey) return { ok: false, error: "sessionKey is required" }
  setStageContext(p.sessionKey, {
    instruction: p.instruction ?? "",
    knowledge: p.knowledge ?? [],
    sharedHistory: p.sharedHistory,
  })
  return { ok: true }
}

/** action = "context.clear"。清除指定 session 的阶段上下文。 */
export function handleContextClear(params: unknown): { ok: boolean; error?: string } {
  const p = params as ContextClearParams | undefined
  if (!p?.sessionKey) return { ok: false, error: "sessionKey is required" }
  clearStageContext(p.sessionKey)
  return { ok: true }
}
