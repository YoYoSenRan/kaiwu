/**
 * Stale 检测——阈值从 cron 配置动态派生
 *
 * stale 阈值 = getCronInterval(phaseType) × STALE_MULTIPLIER
 * 用户调整 cron 间隔或 L3 退避后，阈值自动跟随。
 */
import { db, events } from "@kaiwu/db"
import { eq, and, desc } from "drizzle-orm"
import { getCronInterval } from "@kaiwu/openclaw/gateway-client"
import { STALE_MULTIPLIER } from "./constants"
import type { PhaseContext } from "./types"

/** 更鼓 cron job 名称（和 gateway.template.yaml 中的 cron job name 对应） */
const TICK_CRON_NAME = "造物流更鼓"

/** 检测阶段是否 stale（Agent 无响应） */
export async function detectStale(phase: PhaseContext): Promise<boolean> {
  // 查最近一条 agent_dispatched 事件
  const [lastDispatch] = await db
    .select({ createdAt: events.createdAt })
    .from(events)
    .where(and(eq(events.type, "agent_dispatched"), eq(events.phaseId, phase.id)))
    .orderBy(desc(events.createdAt))
    .limit(1)

  if (!lastDispatch) return false

  // 从 cron 配置实时读取间隔
  let intervalMs: number
  try {
    intervalMs = await getCronInterval(TICK_CRON_NAME)
  } catch {
    // Gateway 不可达时用默认值，避免阻塞
    intervalMs = 20 * 60 * 1000
  }

  const threshold = intervalMs * STALE_MULTIPLIER
  const elapsed = Date.now() - lastDispatch.createdAt.getTime()

  return elapsed > threshold
}
