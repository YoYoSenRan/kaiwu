/**
 * 采风阶段处理器（骨架）
 *
 * 后续由 s07 填充：调用游商采风 + 评分决策。
 * MVP 简化为一次 tick 完成。
 */
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "../types"

export const scoutHandler: PhaseHandler = {
  async advance(_project: ProjectContext, _phase: PhaseContext): Promise<PhaseStepResult> {
    // TODO(s07): 调用游商采风
    return { status: "completed", output: { mock: true }, action: "scout_mock" }
  },
}
