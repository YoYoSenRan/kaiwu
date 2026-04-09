/**
 * 多阶段任务编排契约（主进程侧）。
 *
 * 定义阶段、任务状态和编排器对外接口的类型。
 * 编排器驱动：推知识库 → 发消息 → 监听完成 → 下一阶段。
 */

/** 单个阶段定义。 */
export interface StageDefinition {
  /** 阶段序号（从 1 开始）。 */
  index: number
  /** 阶段名称（用户可见）。 */
  name: string
  /** 阶段指令 → 通过插件注入到 appendSystemContext。 */
  instruction: string
  /** 知识库片段 → 通过插件注入到 prependContext。 */
  knowledge: string[]
  /** 发给 agent 的消息（消息体纯净，不含知识库）。 */
  message: string
}

/** 任务状态。 */
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "aborted"

/** 一个多阶段任务的运行时状态。 */
export interface TaskState {
  /** 任务唯一 ID。 */
  taskId: string
  /** 关联的 OpenClaw sessionKey。 */
  sessionKey: string
  /** 所有阶段定义。 */
  stages: StageDefinition[]
  /** 当前阶段序号（从 1 开始）。 */
  currentStage: number
  /** 任务状态。 */
  status: TaskStatus
  /** 错误信息（status=failed 时有值）。 */
  error?: string
  /** 任务开始时间戳（ms）。 */
  startedAt: number
}

/** 启动任务的输入参数。 */
export interface StartTaskParams {
  /** 关联的 agent ID。 */
  agentId: string
  /** 会话标签。 */
  label?: string
  /** 阶段列表（至少一个）。 */
  stages: StageDefinition[]
}
