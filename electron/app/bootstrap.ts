import { app } from "electron"
import { scope } from "../infra/logger"
import { Lifecycle, Phase } from "../framework/lifecycle"
import type { AppModule } from "../framework/module"
import { createAppContext, type AppContext } from "./context"

const log = scope("bootstrap")

/** 优雅关停总超时：超过则单个 dispose 被跳过。 */
const GRACEFUL_TIMEOUT_MS = 2000
/** 强制退出兜底超时：无论 dispose 结果如何，超过则 process.exit。 */
const FORCE_EXIT_TIMEOUT_MS = 3000

/**
 * 应用启动编排器。按 phase 分组串行执行模块 setup，
 * 推进 lifecycle 阶段，并注册 shutdown handler 做反向 dispose。
 */
export async function bootstrap(modules: AppModule[]): Promise<void> {
  const lifecycle = new Lifecycle()
  const ctx = createAppContext({ lifecycle })
  const groups = groupByPhase(modules)
  const disposers: Array<{ name: string; fn: () => void | Promise<void> }> = []

  registerShutdownHandlers(disposers)

  // Phase.Starting —— whenReady 之前
  await runPhase(Phase.Starting, groups, ctx, disposers)

  // Phase.Ready —— whenReady 之后
  await app.whenReady()
  lifecycle.advance(Phase.Ready)
  await runPhase(Phase.Ready, groups, ctx, disposers)

  // Phase.AfterWindowOpen —— 主窗口已创建
  lifecycle.advance(Phase.AfterWindowOpen)
  await runPhase(Phase.AfterWindowOpen, groups, ctx, disposers)

  // Phase.Eventually —— 稳态
  lifecycle.advance(Phase.Eventually)
  await runPhase(Phase.Eventually, groups, ctx, disposers)

  log.info("启动完成")
}

/** 按 phase 分组，保留数组内相对顺序。 */
function groupByPhase(modules: AppModule[]): Map<Phase, AppModule[]> {
  const map = new Map<Phase, AppModule[]>()
  for (const m of modules) {
    const list = map.get(m.phase) ?? []
    list.push(m)
    map.set(m.phase, list)
  }
  return map
}

async function runPhase(phase: Phase, groups: Map<Phase, AppModule[]>, ctx: AppContext, disposers: Array<{ name: string; fn: () => void | Promise<void> }>): Promise<void> {
  const mods = groups.get(phase) ?? []
  for (const m of mods) {
    log.info(`[${Phase[phase]}] setup ${m.name}`)
    await m.setup(ctx)
    if (m.dispose) {
      disposers.push({ name: m.name, fn: () => m.dispose!(ctx) })
    }
  }
}

/** 绑定 before-quit / SIGINT / SIGTERM 的统一 shutdown 流程。 */
function registerShutdownHandlers(disposers: Array<{ name: string; fn: () => void | Promise<void> }>): void {
  let isQuitting = false

  const graceful = async (): Promise<void> => {
    log.info("开始清理...")
    // 反向执行 dispose，忽略单个失败
    const tasks = [...disposers].reverse().map(async ({ name, fn }) => {
      try {
        await fn()
      } catch (err) {
        log.error(`dispose ${name}`, err)
      }
    })
    await Promise.race([Promise.all(tasks), wait(GRACEFUL_TIMEOUT_MS)])
    log.info("清理完成")
  }

  const scheduleForceExit = (code: number): void => {
    setTimeout(() => {
      log.warn("清理超时，强制退出")
      process.exit(code)
    }, FORCE_EXIT_TIMEOUT_MS).unref()
  }

  app.on("before-quit", (e) => {
    if (isQuitting) return
    isQuitting = true
    e.preventDefault()
    scheduleForceExit(1)
    void graceful().finally(() => app.exit())
  })

  process.on("SIGINT", () => {
    scheduleForceExit(0)
    void graceful().finally(() => process.exit(0))
  })
  process.on("SIGTERM", () => {
    scheduleForceExit(0)
    void graceful().finally(() => process.exit(0))
  })
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
