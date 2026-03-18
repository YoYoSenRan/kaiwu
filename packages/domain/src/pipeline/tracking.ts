/**
 * 流程追溯——每个关键动作写入 events 表
 */
import { emitEvent } from "../events/emitter"
import type { DecisionResult } from "./types"

/** tick 执行摘要 */
export async function trackTickExecuted(projectId: string | null, action: string, phaseType?: string | null): Promise<void> {
  await emitEvent({
    type: "tick_executed",
    title: `更鼓：${action}`,
    detail: { action, phaseType },
    projectId: projectId ?? undefined,
  })
}

/** Agent 任务分发 */
export async function trackAgentDispatched(agentId: string, jobId: string, message: string, projectId?: string, phaseId?: string): Promise<void> {
  await emitEvent({
    type: "agent_dispatched",
    title: `任务分发给 ${agentId}`,
    detail: { agentId, jobId, message },
    projectId,
    phaseId,
    agentId,
  })
}

/** Agent 产出完成 */
export async function trackAgentCompleted(agentId: string, projectId?: string, phaseId?: string): Promise<void> {
  await emitEvent({
    type: "agent_completed",
    title: `${agentId} 已完成`,
    detail: { agentId },
    projectId,
    phaseId,
    agentId,
  })
}

/** Agent 失败 */
export async function trackAgentFailed(agentId: string, error: string, failCount: number, recoveryLevel: string, projectId?: string, phaseId?: string): Promise<void> {
  await emitEvent({
    type: "agent_failed",
    title: `${agentId} 失败（${recoveryLevel}）`,
    detail: { agentId, error, failCount, recoveryLevel },
    projectId,
    phaseId,
    agentId,
  })
}

/** 阶段流转 */
export async function trackPhaseTransition(projectId: string, fromPhase: string, decision: DecisionResult): Promise<void> {
  await emitEvent({
    type: "phase_transition",
    title: `${fromPhase} → ${decision.nextPhase ?? decision.targetPhase ?? "sealed"}`,
    detail: { from: fromPhase, to: decision.nextPhase ?? decision.targetPhase, action: decision.action, reason: decision.reason },
    projectId,
  })
}

/** LLM provider 不可用 */
export async function trackProviderDown(): Promise<void> {
  await emitEvent({
    type: "provider_down",
    title: "LLM provider 不可用",
    detail: { timestamp: new Date().toISOString() },
  })
}

/** LLM provider 恢复 */
export async function trackProviderRecovered(): Promise<void> {
  await emitEvent({
    type: "provider_recovered",
    title: "LLM provider 已恢复",
    detail: { timestamp: new Date().toISOString() },
  })
}
