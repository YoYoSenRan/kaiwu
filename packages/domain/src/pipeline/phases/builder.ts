/**
 * 锻造阶段处理器（骨架）
 *
 * 后续由 s11 填充：匠人分步锻造 + 试剑轻检。
 * 多任务可返回 in_progress，逐步推进。
 */
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "../types"

export const builderHandler: PhaseHandler = {
  async advance(_project: ProjectContext, _phase: PhaseContext): Promise<PhaseStepResult> {
    // TODO(s11): 管理任务分配 + 匠人子角色调度
    return { status: "completed", output: { mock: true }, action: "builder_mock" }
  },
}
