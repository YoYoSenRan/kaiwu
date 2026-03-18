/** 阶段状态 */
export const PHASE_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  BLOCKED: "blocked",
} as const

export type PhaseStatus = (typeof PHASE_STATUS)[keyof typeof PHASE_STATUS]

/** 项目状态 */
export const PROJECT_STATUS = {
  RUNNING: "running",
  LAUNCHED: "launched",
  DEAD: "dead",
  BLOCKED: "blocked",
} as const

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS]

/** 阶段类型 */
export const PHASE_TYPE = {
  SCOUT: "scout",
  COUNCIL: "council",
  ARCHITECT: "architect",
  BUILDER: "builder",
  INSPECTOR: "inspector",
  DEPLOYER: "deployer",
} as const

export type PhaseType = (typeof PHASE_TYPE)[keyof typeof PHASE_TYPE]

/** 阶段流转顺序 */
export const PHASE_ORDER: PhaseType[] = [PHASE_TYPE.SCOUT, PHASE_TYPE.COUNCIL, PHASE_TYPE.ARCHITECT, PHASE_TYPE.BUILDER, PHASE_TYPE.INSPECTOR, PHASE_TYPE.DEPLOYER]

/** stale 检测倍数——阈值 = cron 间隔 × 此值 */
export const STALE_MULTIPLIER = 3

/** 造物令超时（毫秒）——72 小时 */
export const PROJECT_TIMEOUT_MS = 72 * 60 * 60 * 1000

/** L4 暂停后自动封存（毫秒）——24 小时 */
export const BLOCKED_AUTO_SEAL_MS = 24 * 60 * 60 * 1000

/** 指数退避上限（毫秒）——120 分钟 */
export const BACKOFF_CEILING_MS = 120 * 60 * 1000
