/**
 * 四级自愈机制——根据 failCount 返回恢复动作
 */
import type { RecoveryAction, PhaseContext } from "./types"

/**
 * 根据失败次数决定恢复级别
 *
 * L1 (1次): 立即重试
 * L2 (2次): 调整重试（附加失败上下文）
 * L3 (3次): 指数退避降速
 * L4 (4+次): 暂停造物令
 */
export function handleFailure(failCount: number, _phase: PhaseContext): RecoveryAction {
  if (failCount <= 1) {
    return { level: "L1", action: "retry" }
  }

  if (failCount === 2) {
    return { level: "L2", action: "adjust_retry", adjustment: "附加上次失败原因到 prompt" }
  }

  if (failCount === 3) {
    return { level: "L3", action: "backoff" }
  }

  return { level: "L4", action: "block" }
}
