/**
 * context 能力的 invoke action 处理器。
 *
 * 被 http.ts 的路由分派器按 action 字段调用，不直接注册为 HTTP handler。
 * kaiwu 主进程通过 invokePlugin({action: "stage.set", params: {...}}) 触发。
 */

import type { StageClearParams, StageSetParams } from "./contract.js"

import { clearStageContext, setStageContext } from "./store.js"

/** 写入或覆盖阶段上下文。 */
export function handleStageSet(params: unknown): { ok: boolean; error?: string } {
  const p = params as StageSetParams | undefined
  if (!p?.sessionKey) {
    return { ok: false, error: "sessionKey is required" }
  }
  setStageContext(p.sessionKey, {
    instruction: p.instruction ?? "",
    knowledge: p.knowledge ?? [],
  })
  return { ok: true }
}

/** 清除指定 session 的阶段上下文。 */
export function handleStageClear(params: unknown): { ok: boolean; error?: string } {
  const p = params as StageClearParams | undefined
  if (!p?.sessionKey) {
    return { ok: false, error: "sessionKey is required" }
  }
  clearStageContext(p.sessionKey)
  return { ok: true }
}
