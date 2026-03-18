/**
 * 过堂阶段处理器（骨架）
 *
 * 后续由 s08 填充：说客/诤臣串行辩论 + 掌秤裁决。
 * 每次 tick 推进一轮（说客+诤臣）或掌秤裁决。
 */
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "../types"

export const councilHandler: PhaseHandler = {
  async advance(_project: ProjectContext, _phase: PhaseContext): Promise<PhaseStepResult> {
    // TODO(s08): 管理多轮辩论 + 裁决
    return { status: "completed", output: { mock: true }, action: "council_mock" }
  },
}
