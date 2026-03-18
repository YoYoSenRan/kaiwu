/**
 * Agent 属性计算框架（骨架）
 *
 * 具体公式在后续模块填充（s12 复盘时计算）。
 * 本阶段只定义接口和空实现。
 */
import type { PhaseType } from "../pipeline/constants"

interface StatsUpdateInput {
  agentId: string
  projectId: string
  phaseType: PhaseType
  outcome: "success" | "failure"
  metrics?: Record<string, number>
}

/**
 * 计算并更新 Agent 属性（骨架）
 *
 * 后续模块根据各角色的具体评价维度填充：
 * - 游商：嗅觉/脚力/见闻/慧眼
 * - 说客：口才/博引/韧性/信誉
 * - ...
 */
export async function updateAgentStats(_input: StatsUpdateInput): Promise<void> {
  // TODO(s12): 填充属性计算公式
}
