/**
 * 采风阶段处理器——异步状态机
 *
 * 首次调用：分发采风任务给游商（in_progress）
 * 后续调用：检查产出 → 校验 → completed/failed
 */
import { db, keywords } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import type { PhaseHandler, PhaseStepResult, ProjectContext, PhaseContext } from "../types"
import { callAgent } from "../../agents/caller"
import { getEpitaph } from "../epitaphs"

/** 采风报告轻量校验（不引入跨包 Zod schema） */
function validateScoutReport(output: unknown): { valid: boolean; overallScore: number; privateNote?: string } {
  if (!output || typeof output !== "object") return { valid: false, overallScore: 0 }

  const report = output as Record<string, unknown>
  const bg = report.background
  const dims = report.dimensions
  const score = report.overallScore

  if (!bg || typeof bg !== "object") return { valid: false, overallScore: 0 }
  if (!dims || typeof dims !== "object") return { valid: false, overallScore: 0 }
  if (typeof score !== "number" || score < 0 || score > 100) return { valid: false, overallScore: 0 }

  return { valid: true, overallScore: score, privateNote: typeof report.privateNote === "string" ? report.privateNote : undefined }
}

/** 组装采风消息——包含 context 块供 Agent 提取工具参数 */
async function buildScoutMessage(project: ProjectContext, phase: PhaseContext): Promise<string> {
  let message = `[context]\nprojectId: ${project.id}\nphaseId: ${phase.id}\nagentId: youshang\n\n`
  message += `[task]\n采风任务：请为以下物帖做完整采风。\n\n`

  if (project.keywordId) {
    const [kw] = await db.select().from(keywords).where(eq(keywords.id, project.keywordId))
    if (kw) {
      message += `物帖：${kw.text}\n`
      message += `理由：${kw.reason}\n`
      if (kw.preScoutData) {
        message += `\n预采风数据（仅供参考）：${JSON.stringify(kw.preScoutData)}\n`
      }
    }
  }

  message += `\n请先生成项目背景书，再做四维度调研，最后综合评分。通过 submit_scout_report 一次性提交完整采风报告。`
  return message
}

export const scoutHandler: PhaseHandler = {
  async advance(project: ProjectContext, phase: PhaseContext): Promise<PhaseStepResult> {
    // 有产出 → 校验并返回 completed
    if (phase.output) {
      const { valid, overallScore, privateNote } = validateScoutReport(phase.output)

      if (!valid) {
        return { status: "failed", error: "采风报告格式异常", action: "scout_validation_failed" }
      }

      // 封存辞处理：评分 < 60 时用编排层模板
      if (overallScore < 60) {
        let epitaph = getEpitaph("low_score")
        if (privateNote) {
          epitaph += `\n——游商附言：${privateNote}`
        }
        // 封存辞附加到 output 上，供 transitions 使用
        const enrichedOutput = { ...(phase.output as Record<string, unknown>), _epitaph: epitaph }
        return { status: "completed", output: enrichedOutput, action: "scout_completed_seal" }
      }

      return { status: "completed", output: phase.output, action: "scout_completed" }
    }

    // 无产出 → 分发采风任务
    const message = await buildScoutMessage(project, phase)

    await callAgent({
      agentId: "youshang",
      message,
      projectId: project.id,
      phaseId: phase.id,
    })

    return { status: "in_progress", action: "scout_dispatched" }
  },
}
