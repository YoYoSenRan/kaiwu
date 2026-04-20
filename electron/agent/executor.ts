/**
 * 单 step 执行器：封装 openclaw chat.send 调用 + 订阅 gateway event 帧汇总流式结果。
 *
 * 消费者（direct.ts / group.ts / 未来 flow runner）只需 await runStep(...) 拿到汇总 StepResult，
 * 流式 delta 通过 onEvent 回调暴露（UI 可立即更新）。
 *
 * 命名：本次调用的唯一标识一律叫 idempotencyKey（kaiwu 生成 + 传给 openclaw）。
 * openclaw event payload 字段 runId 在边界处（service.ts subscribeGatewayChatEvents）立即 alias 为 idempotencyKey。
 */

import { nanoid } from "nanoid"
import type { StepEvent, StepInput, StepResult, StepUsage } from "./types"

/** 调用 openclaw.chat.send + 订阅 gateway event 的依赖接口（便于测试注入）。 */
export interface ChatBackend {
  /** 调 openclaw chat.send。返回后流式通过 events 订阅。 */
  send(params: { sessionKey: string; message: string; idempotencyKey: string }): Promise<void>
  /** 订阅 gateway event 帧，按 idempotencyKey 过滤；返回 unsubscribe。 */
  onEvent(idempotencyKey: string, listener: (ev: StepEvent) => void): () => void
  /** abort 正在执行的调用。 */
  abort(params: { sessionKey: string; idempotencyKey: string }): Promise<void>
}

/**
 * 执行一个 agent step。
 * @param input.idempotencyKey 预先分配；即 openclaw chat.send 的 idempotencyKey（openclaw event 回传时叫 runId）
 * @param onEvent 流式事件回调（delta / final / aborted / error）
 */
export async function runStep(backend: ChatBackend, input: StepInput, onEvent?: (ev: StepEvent) => void): Promise<StepResult> {
  return new Promise<StepResult>((resolve) => {
    let buffer = ""
    let stopReason: string | undefined
    let usage: StepUsage | undefined

    const unsub = backend.onEvent(input.idempotencyKey, (ev) => {
      onEvent?.(ev)
      if (ev.kind === "delta") {
        // 龙虾 delta 为 overwrite 语义:每帧是当前完整文本,非增量。
        // 累加会重复堆叠,final 无 content 回退或 aborted partial 场景会拿到错乱字符串。
        buffer = ev.content
      } else if (ev.kind === "final") {
        buffer = ev.content || buffer
        stopReason = ev.stopReason
        usage = ev.usage
        unsub()
        resolve({ idempotencyKey: input.idempotencyKey, success: true, content: buffer, stopReason, usage })
      } else if (ev.kind === "aborted") {
        unsub()
        resolve({ idempotencyKey: input.idempotencyKey, success: false, content: buffer, error: "aborted" })
      } else if (ev.kind === "error") {
        unsub()
        resolve({ idempotencyKey: input.idempotencyKey, success: false, content: buffer, error: ev.message, errorKind: ev.errorKind })
      }
    })

    backend.send({ sessionKey: input.sessionKey, message: input.message, idempotencyKey: input.idempotencyKey }).catch((err: Error & { errorKind?: string }) => {
      unsub()
      resolve({ idempotencyKey: input.idempotencyKey, success: false, content: "", error: err.message, errorKind: err.errorKind })
    })
  })
}

/** 分配一个新 idempotencyKey（幂等键，同时作为本次 run 的客户端唯一标识）。 */
export function newIdempotencyKey(): string {
  return nanoid()
}
