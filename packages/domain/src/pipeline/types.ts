import type { PhaseStatus, PhaseType } from "./constants"

/** 阶段处理器返回结果 */
export interface PhaseStepResult {
  /** completed=产出就绪可流转，in_progress=有进展但未完成，failed=执行失败 */
  status: "completed" | "in_progress" | "failed"
  /** 阶段产出（仅 completed 时有值） */
  output?: unknown
  /** 失败原因（仅 failed 时有值） */
  error?: string
  /** 本次 tick 执行的动作描述 */
  action?: string
}

/** 阶段处理器统一接口 */
export interface PhaseHandler {
  /** 推进阶段一步 */
  advance(project: ProjectContext, phase: PhaseContext): Promise<PhaseStepResult>
}

/** tick 传入的项目上下文 */
export interface ProjectContext {
  id: string
  keywordId: string | null
  name: string | null
  slug: string | null
  status: string
  currentPhase: string | null
  startedAt: Date | null
}

/** tick 传入的阶段上下文 */
export interface PhaseContext {
  id: string
  projectId: string
  type: PhaseType
  status: PhaseStatus
  attempt: number
  failCount: number
  input: unknown
  output: unknown
  startedAt: Date | null
}

/** tick 返回结果 */
export interface TickResult {
  projectId: string | null
  action: "advanced" | "dispatched" | "waiting" | "failed" | "sealed" | "blocked" | "skipped"
  detail: string
  phaseType?: PhaseType
}

/** 决策结果 */
export interface DecisionResult {
  action: "advance" | "rollback" | "seal"
  nextPhase?: PhaseType
  targetPhase?: PhaseType
  reason: string
}

/** 自愈级别 */
export interface RecoveryAction {
  level: "L1" | "L2" | "L3" | "L4"
  action: "retry" | "adjust_retry" | "backoff" | "block"
  adjustment?: string
}
