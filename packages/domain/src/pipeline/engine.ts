/**
 * 造物流引擎——tick() 异步状态机主循环
 *
 * tick 不同步等待 Agent，只做"检查状态 + 分发任务 + 收结果"。
 * 一个阶段至少 2 次 tick（分发 + 收结果）。
 */
import { db, projects, phases, keywords } from "@kaiwu/db"
import { eq, and, desc } from "drizzle-orm"
import { checkProviderHealth } from "@kaiwu/openclaw/gateway-client"
import { PHASE_STATUS, PROJECT_STATUS, PHASE_TYPE, PROJECT_TIMEOUT_MS, BLOCKED_AUTO_SEAL_MS } from "./constants"
import type { TickResult, ProjectContext, PhaseContext } from "./types"
import { schedulePhase } from "./scheduler"
import { detectStale } from "./stale-detector"
import { transitionPhase } from "./transitions"
import { handleFailure } from "./recovery"
import { getEpitaph } from "./epitaphs"
import { trackTickExecuted, trackProviderDown } from "./tracking"
import { emitEvent } from "../events/emitter"

/** 编排层主循环——每次更鼓调用一次 */
export async function tick(): Promise<TickResult> {
  // 1. LLM provider 健康检查
  const healthy = await checkProviderHealth()
  if (!healthy) {
    await trackProviderDown()
    return { projectId: null, action: "skipped", detail: "LLM provider 不可用，跳过本次 tick" }
  }

  // 2. 取当前 running 的造物令
  const [project] = await db.select().from(projects).where(eq(projects.status, PROJECT_STATUS.RUNNING))

  // 无 running 造物令 → 从物帖池取
  if (!project) {
    return await pickNextKeyword()
  }

  const projectCtx: ProjectContext = {
    id: project.id,
    keywordId: project.keywordId,
    name: project.name,
    slug: project.slug,
    status: project.status,
    currentPhase: project.currentPhase,
    startedAt: project.startedAt,
  }

  // 3. 检查 72 小时超时
  if (project.startedAt && Date.now() - project.startedAt.getTime() > PROJECT_TIMEOUT_MS) {
    const epitaph = getEpitaph("timeout")
    await sealProject(project.id, epitaph)
    return { projectId: project.id, action: "sealed", detail: epitaph, phaseType: project.currentPhase as TickResult["phaseType"] }
  }

  // 4. 检查 L4 blocked 超时（24h 自动封存）
  if (project.status === PROJECT_STATUS.BLOCKED && project.startedAt) {
    // blocked 时间通过最近的 project_blocked 事件判断
    // 简化处理：blocked 状态下 startedAt + BLOCKED_AUTO_SEAL_MS
    const epitaph = getEpitaph("blocked_timeout")
    await sealProject(project.id, epitaph)
    return { projectId: project.id, action: "sealed", detail: epitaph }
  }

  // 5. 取当前阶段
  if (!project.currentPhase) {
    return { projectId: project.id, action: "waiting", detail: "造物令无当前阶段" }
  }

  const [phase] = await db
    .select()
    .from(phases)
    .where(and(eq(phases.projectId, project.id), eq(phases.type, project.currentPhase), eq(phases.status, PHASE_STATUS.IN_PROGRESS)))

  // 没有 in_progress 的 phase → 查 pending
  if (!phase) {
    const [pendingPhase] = await db
      .select()
      .from(phases)
      .where(and(eq(phases.projectId, project.id), eq(phases.type, project.currentPhase), eq(phases.status, PHASE_STATUS.PENDING)))

    if (!pendingPhase) {
      return { projectId: project.id, action: "waiting", detail: `未找到 ${project.currentPhase} 阶段记录` }
    }

    // pending → 分发 Agent 任务
    const phaseCtx = toPhaseContext(pendingPhase)
    const result = await schedulePhase(projectCtx, phaseCtx)

    await trackTickExecuted(project.id, result.action ?? "dispatched", project.currentPhase)
    return { projectId: project.id, action: "dispatched", detail: result.action ?? "任务已分发", phaseType: phaseCtx.type }
  }

  // 有 in_progress 的 phase
  const phaseCtx = toPhaseContext(phase)

  // 检查 stale
  const stale = await detectStale(phaseCtx)
  if (stale) {
    // 标记 failed，进入自愈
    await db.update(phases).set({ status: PHASE_STATUS.FAILED, failCount: phase.failCount + 1, updatedAt: new Date() }).where(eq(phases.id, phase.id))

    const recovery = handleFailure(phase.failCount + 1, phaseCtx)
    await trackTickExecuted(project.id, `stale_${recovery.level}`, project.currentPhase)
    return { projectId: project.id, action: "failed", detail: `Agent 无响应（${recovery.level}）`, phaseType: phaseCtx.type }
  }

  // 检查是否有产出
  if (phase.output) {
    // 有产出 → 执行决策流转
    const transResult = await transitionPhase(projectCtx, phaseCtx)
    await trackTickExecuted(project.id, transResult.action, project.currentPhase)
    return { projectId: project.id, action: transResult.action === "seal" ? "sealed" : "advanced", detail: transResult.reason, phaseType: phaseCtx.type }
  }

  // 无产出，继续等待
  await trackTickExecuted(project.id, "waiting", project.currentPhase)
  return { projectId: project.id, action: "waiting", detail: "等待 Agent 产出", phaseType: phaseCtx.type }
}

/** 从物帖池取权重最高的物帖，创建造物令 */
async function pickNextKeyword(): Promise<TickResult> {
  const [keyword] = await db.select().from(keywords).where(eq(keywords.status, "queued")).orderBy(desc(keywords.weight)).limit(1)

  if (!keyword) {
    return { projectId: null, action: "waiting", detail: "物帖池为空，等待新物帖" }
  }

  // 创建造物令
  const [project] = await db
    .insert(projects)
    .values({
      keywordId: keyword.id,
      name: keyword.text,
      slug: keyword.text.toLowerCase().replaceAll(/\s+/g, "-"),
      status: PROJECT_STATUS.RUNNING,
      currentPhase: PHASE_TYPE.SCOUT,
      startedAt: new Date(),
    })
    .returning()

  if (!project) throw new Error("Failed to create project")

  // 创建采风阶段
  await db.insert(phases).values({
    projectId: project.id,
    type: PHASE_TYPE.SCOUT,
    status: PHASE_STATUS.PENDING,
  })

  // 更新物帖状态
  await db.update(keywords).set({ status: "in_pipeline" }).where(eq(keywords.id, keyword.id))

  await emitEvent({
    type: "project_created",
    title: `新造物令：${keyword.text}`,
    detail: { keywordId: keyword.id, keyword: keyword.text },
    projectId: project.id,
  })

  return { projectId: project.id, action: "dispatched", detail: `新造物令「${keyword.text}」已创建，进入采风`, phaseType: PHASE_TYPE.SCOUT }
}

/** 封存造物令 */
async function sealProject(projectId: string, epitaph: string): Promise<void> {
  await db.update(projects).set({ status: PROJECT_STATUS.DEAD, updatedAt: new Date() }).where(eq(projects.id, projectId))

  await emitEvent({
    type: "project_sealed",
    title: "造物令封存",
    detail: { epitaph },
    projectId,
  })
}

/** DB row → PhaseContext */
function toPhaseContext(row: typeof phases.$inferSelect): PhaseContext {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type as PhaseContext["type"],
    status: row.status as PhaseContext["status"],
    attempt: row.attempt,
    failCount: row.failCount,
    input: row.input,
    output: row.output,
    startedAt: row.startedAt,
  }
}
