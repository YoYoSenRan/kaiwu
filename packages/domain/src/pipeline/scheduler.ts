/**
 * 阶段调度器——根据 phase.type 分发到对应的 PhaseHandler
 */
import { db, phases } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import { PHASE_STATUS, PHASE_TYPE } from "./constants"
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "./types"
import { callAgent } from "../agents/caller"
import { markWorking } from "../agents/activity"

// 骨架处理器 import
import { scoutHandler } from "./phases/scout"
import { councilHandler } from "./phases/council"
import { architectHandler } from "./phases/architect"
import { builderHandler } from "./phases/builder"
import { inspectorHandler } from "./phases/inspector"
import { deployerHandler } from "./phases/deployer"

/** 阶段类型 → 处理器映射 */
const HANDLERS: Record<string, PhaseHandler> = {
  [PHASE_TYPE.SCOUT]: scoutHandler,
  [PHASE_TYPE.COUNCIL]: councilHandler,
  [PHASE_TYPE.ARCHITECT]: architectHandler,
  [PHASE_TYPE.BUILDER]: builderHandler,
  [PHASE_TYPE.INSPECTOR]: inspectorHandler,
  [PHASE_TYPE.DEPLOYER]: deployerHandler,
}

/** 阶段类型 → 负责 Agent 映射 */
const PHASE_AGENTS: Record<string, string> = {
  [PHASE_TYPE.SCOUT]: "youshang",
  [PHASE_TYPE.COUNCIL]: "shuike", // 过堂阶段由处理器内部管理多 Agent
  [PHASE_TYPE.ARCHITECT]: "huashi",
  [PHASE_TYPE.BUILDER]: "jiangren",
  [PHASE_TYPE.INSPECTOR]: "shijian",
  [PHASE_TYPE.DEPLOYER]: "mingluo",
}

/**
 * 调度阶段——从 pending 状态分发 Agent 任务
 *
 * 调用对应的 PhaseHandler.advance()，骨架实现直接返回 mock。
 * 后续模块填充后会通过 callAgent() 异步分发。
 */
export async function schedulePhase(project: ProjectContext, phase: PhaseContext): Promise<PhaseStepResult> {
  const handler = HANDLERS[phase.type]
  if (!handler) {
    return { status: "failed", error: `未知的阶段类型: ${phase.type}` }
  }

  // 更新 phase 状态为 in_progress
  await db.update(phases).set({ status: PHASE_STATUS.IN_PROGRESS, startedAt: new Date(), updatedAt: new Date() }).where(eq(phases.id, phase.id))

  // 更新 Agent 活动状态
  const agentId = PHASE_AGENTS[phase.type]
  if (agentId) {
    await markWorking(agentId, `正在为「${project.name ?? "未命名"}」执行 ${phase.type}`, project.id)
  }

  // 调用阶段处理器
  return handler.advance(project, phase)
}
