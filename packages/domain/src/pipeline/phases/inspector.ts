/**
 * 试剑阶段处理器（骨架）
 *
 * 后续由 s11 填充：试剑全检 + 回炉机制。
 */
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "../types"

export const inspectorHandler: PhaseHandler = {
  async advance(_project: ProjectContext, _phase: PhaseContext): Promise<PhaseStepResult> {
    // TODO(s11): 试剑全检 + 回炉判定
    return { status: "completed", output: { mock: true }, action: "inspector_mock" }
  },
}
