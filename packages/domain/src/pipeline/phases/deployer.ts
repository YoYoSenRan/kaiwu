/**
 * 鸣锣阶段处理器（骨架）
 *
 * 后续由 s12 填充：部署 + 冒烟测试 + 鸣锣。
 */
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "../types"

export const deployerHandler: PhaseHandler = {
  async advance(_project: ProjectContext, _phase: PhaseContext): Promise<PhaseStepResult> {
    // TODO(s12): 部署 + 冒烟测试
    return { status: "completed", output: { mock: true }, action: "deployer_mock" }
  },
}
