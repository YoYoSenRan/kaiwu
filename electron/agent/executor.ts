/**
 * 单 step 执行器：封装 openclaw chat.send 调用 + 订阅 gateway event 帧汇总流式结果。
 *
 * 消费者（group.ts / single.ts / 未来 flow runner）只需 await runStep(...) 拿到汇总 StepResult，
 * 流式 delta 通过 onEvent 回调暴露（UI 可立即更新）。
 */

import { nanoid } from "nanoid"
import type { StepEvent, StepInput, StepResult, StepUsage } from "./types"

/** 调用 openclaw.chat.send + 订阅 gateway event 的依赖接口（便于测试注入）。 */
export interface ChatBackend {
  /** 调 openclaw chat.send。返回后流式通过 events 订阅。 */
  send(params: { sessionKey: string; message: string; idempotencyKey: string }): Promise<void>
  /** 订阅 gateway event 帧，按 runId 过滤；返回 unsubscribe。 */
  onEvent(runId: string, listener: (ev: StepEvent) => void): () => void
  /** abort 正在执行的 run。 */
  abort(params: { sessionKey: string; runId: string }): Promise<void>
}

/**
 * 执行一个 agent step。
 * @param input.runId 预先分配；等于 openclaw chat.send 的 idempotencyKey
 * @param onEvent 流式事件回调（delta / final / aborted / error）
 */
export async function runStep(backend: ChatBackend, input: StepInput, onEvent?: (ev: StepEvent) => void): Promise<StepResult> {
  return new Promise<StepResult>((resolve) => {
    let buffer = ""
    let stopReason: string | undefined
    let usage: StepUsage | undefined

    const unsub = backend.onEvent(input.runId, (ev) => {
      onEvent?.(ev)
      if (ev.kind === "delta") {
        buffer += ev.content
      } else if (ev.kind === "final") {
        buffer = ev.content || buffer
        stopReason = ev.stopReason
        usage = ev.usage
        unsub()
        resolve({ runId: input.runId, success: true, content: buffer, stopReason, usage })
      } else if (ev.kind === "aborted") {
        unsub()
        resolve({ runId: input.runId, success: false, content: buffer, error: "aborted" })
      } else if (ev.kind === "error") {
        unsub()
        resolve({ runId: input.runId, success: false, content: buffer, error: ev.message })
      }
    })

    // 发送后等待事件；backend.send 返回不含内容，内容通过事件流来
    backend.send({ sessionKey: input.sessionKey, message: input.message, idempotencyKey: input.runId }).catch((err) => {
      unsub()
      resolve({ runId: input.runId, success: false, content: "", error: (err as Error).message })
    })
  })
}

/** 分配一个新 runId。 */
export function newRunId(): string {
  return nanoid()
}
