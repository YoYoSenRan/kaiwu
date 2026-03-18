/**
 * 绘图阶段处理器（骨架）
 *
 * 后续由 s11 填充：调用画师绘制蓝图。
 */
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "../types"

export const architectHandler: PhaseHandler = {
  async advance(_project: ProjectContext, _phase: PhaseContext): Promise<PhaseStepResult> {
    // TODO(s11): 调用画师绘制蓝图
    return { status: "completed", output: { mock: true }, action: "architect_mock" }
  },
}
