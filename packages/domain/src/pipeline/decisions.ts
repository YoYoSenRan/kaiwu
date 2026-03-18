/**
 * 自动决策规则——根据阶段产出决定下一步
 */
import { PHASE_TYPE } from "./constants"
import type { DecisionResult } from "./types"
import { getEpitaph } from "./epitaphs"

/** 采风后决策：评分 ≥ 60 进过堂，< 60 封存 */
export function decideAfterScout(output: unknown): DecisionResult {
  const score = (output as { overallScore?: number })?.overallScore ?? 0

  if (score >= 60) {
    return { action: "advance", nextPhase: PHASE_TYPE.COUNCIL, reason: `采风评分 ${score} ≥ 60，进入过堂` }
  }

  return { action: "seal", reason: getEpitaph("low_score") }
}

/** 过堂后决策：掌秤裁决 approved → 绘图，rejected → 封存，conditional → 绘图 */
export function decideAfterCouncil(output: unknown): DecisionResult {
  const verdict = (output as { verdict?: string })?.verdict

  if (verdict === "rejected") {
    const epitaph = (output as { epitaph?: string })?.epitaph ?? getEpitaph("rejected")
    return { action: "seal", reason: epitaph }
  }

  // approved 或 conditional 都进绘图
  return { action: "advance", nextPhase: PHASE_TYPE.ARCHITECT, reason: `掌秤裁决：${verdict ?? "approved"}，进入绘图` }
}

/** 试剑后决策：pass → 鸣锣，fail → 回退锻造（最多 3 轮） */
export function decideAfterInspector(output: unknown, attempt: number): DecisionResult {
  const verdict = (output as { verdict?: string })?.verdict
  const summary = output as { summary?: { critical?: number; warning?: number } }

  if (verdict === "pass") {
    return { action: "advance", nextPhase: PHASE_TYPE.DEPLOYER, reason: "试剑通过，进入鸣锣" }
  }

  // fail → 检查轮次
  if (attempt >= 3) {
    return { action: "seal", reason: getEpitaph("inspection_failed") }
  }

  return {
    action: "rollback",
    targetPhase: PHASE_TYPE.BUILDER,
    reason: `试剑不通过（🔴${summary.summary?.critical ?? 0} 🟡${summary.summary?.warning ?? 0}），回退锻造（第 ${attempt + 1} 轮）`,
  }
}

/** 鸣锣后决策：冒烟通过 → 上线，失败 → 回退试剑 */
export function decideAfterDeployer(output: unknown): DecisionResult {
  const smokeTest = (output as { smokeTest?: { passed?: boolean } })?.smokeTest

  if (smokeTest?.passed) {
    return { action: "advance", reason: "冒烟测试通过，鸣锣成功" }
  }

  return { action: "rollback", targetPhase: PHASE_TYPE.INSPECTOR, reason: "冒烟测试失败，回退试剑" }
}
