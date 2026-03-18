/**
 * 阶段流转——事务内状态变更 + 事件写入
 */
import { db, phases, projects } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import { PHASE_STATUS, PROJECT_STATUS, PHASE_ORDER } from "./constants"
import type { ProjectContext, PhaseContext, DecisionResult } from "./types"
import { decideAfterScout, decideAfterCouncil, decideAfterInspector, decideAfterDeployer } from "./decisions"
import { getEpitaph } from "./epitaphs"
import { trackPhaseTransition } from "./tracking"
import { emitEvent } from "../events/emitter"
import { markIdle } from "../agents/activity"

/** 执行阶段流转（事务内） */
export async function transitionPhase(project: ProjectContext, phase: PhaseContext): Promise<DecisionResult> {
  const decision = makeDecision(phase)

  await db.transaction(async (tx) => {
    // 1. 标记当前阶段完成
    await tx.update(phases).set({ status: PHASE_STATUS.COMPLETED, completedAt: new Date(), updatedAt: new Date() }).where(eq(phases.id, phase.id))

    if (decision.action === "advance" && decision.nextPhase) {
      // 2a. 创建下一阶段
      await tx.insert(phases).values({ projectId: project.id, type: decision.nextPhase, status: PHASE_STATUS.PENDING })

      // 3a. 更新项目当前阶段
      await tx.update(projects).set({ currentPhase: decision.nextPhase, updatedAt: new Date() }).where(eq(projects.id, project.id))
    } else if (decision.action === "rollback" && decision.targetPhase) {
      // 2b. 回退到目标阶段（如试剑打回锻造）
      await tx.insert(phases).values({ projectId: project.id, type: decision.targetPhase, status: PHASE_STATUS.PENDING })

      await tx.update(projects).set({ currentPhase: decision.targetPhase, updatedAt: new Date() }).where(eq(projects.id, project.id))
    } else if (decision.action === "seal") {
      // 2c. 封存
      await tx.update(projects).set({ status: PROJECT_STATUS.DEAD, updatedAt: new Date() }).where(eq(projects.id, project.id))
    }
  })

  // 事务外：追溯事件 + Agent 状态 + SSE
  await trackPhaseTransition(project.id, phase.type, decision)

  await emitEvent({
    type: "phase_transition",
    title: decision.action === "seal" ? "造物令封存" : `${phase.type} → ${decision.nextPhase ?? decision.targetPhase}`,
    detail: { from: phase.type, to: decision.nextPhase ?? decision.targetPhase, decision: decision.action, reason: decision.reason },
    projectId: project.id,
    phaseId: phase.id,
  })

  // 重置相关 Agent 状态
  await markIdle(getAgentForPhase(phase.type))

  return decision
}

/** 根据阶段类型选择决策函数 */
function makeDecision(phase: PhaseContext): DecisionResult {
  switch (phase.type) {
    case "scout":
      return decideAfterScout(phase.output)
    case "council":
      return decideAfterCouncil(phase.output)
    case "inspector":
      return decideAfterInspector(phase.output, phase.attempt)
    case "deployer":
      return decideAfterDeployer(phase.output)
    default: {
      // architect / builder 无条件推进到下一阶段
      const idx = PHASE_ORDER.indexOf(phase.type)
      const next = PHASE_ORDER[idx + 1]
      if (!next) return { action: "seal", reason: "最后一个阶段完成" }
      return { action: "advance", nextPhase: next, reason: `${phase.type} 完成，进入 ${next}` }
    }
  }
}

/** 阶段 → Agent 映射 */
function getAgentForPhase(phaseType: string): string {
  const map: Record<string, string> = { scout: "youshang", council: "zhangcheng", architect: "huashi", builder: "jiangren", inspector: "shijian", deployer: "mingluo" }
  return map[phaseType] ?? "youshang"
}
