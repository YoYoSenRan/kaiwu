/**
 * Agent 原子执行单元的通用类型。
 *
 * 业务无关层：chat 模块（direct / group loop）和未来 flow 模块（DAG 执行器）都消费这里。
 * 关心的是 "一个 agent 执行一次" 的输入/输出/事件，不关心编排策略。
 *
 * 命名对齐 openclaw：本次执行的客户端侧唯一标识一律叫 `idempotencyKey`。
 * 该值同时作为 openclaw chat.send 的入参 idempotencyKey 和流式 event 回传的 runId。
 */

/** 单步执行的输入。 */
export interface StepInput {
  /** 被调度 agent 对应的 openclaw session key。 */
  sessionKey: string
  /** 被调度 agent 的 id（openclaw agent id，仅用于日志/追踪）。 */
  agentId: string
  /** 本次要发送给 agent 的 user / tool / assistant 消息正文。 */
  message: string
  /** 本次调用的幂等键（由调用者分配，传给 openclaw chat.send 的 idempotencyKey）。 */
  idempotencyKey: string
}

/** 单步执行流式事件。 */
export type StepEvent =
  | { kind: "delta"; idempotencyKey: string; content: string }
  | { kind: "final"; idempotencyKey: string; content: string; stopReason?: string; usage?: StepUsage }
  | { kind: "aborted"; idempotencyKey: string }
  | { kind: "error"; idempotencyKey: string; message: string; errorKind?: string }

export interface StepUsage {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  total?: number
}

/** 单步执行结果（所有流式事件汇总）。 */
export interface StepResult {
  idempotencyKey: string
  success: boolean
  content: string
  stopReason?: string
  usage?: StepUsage
  error?: string
}
