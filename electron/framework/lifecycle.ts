import { scope } from "../infra/logger"

const log = scope("lifecycle")

/**
 * 应用启动阶段。严格单调递增，advance 回退会抛错。
 *
 * - Starting: 应用进程刚启动，whenReady 之前。做同步平台准备、协议注册、单实例锁。
 * - Ready: whenReady 已 resolve。做 CSP、菜单、窗口创建、托盘/快捷键等 OS 副作用。
 * - AfterWindowOpen: 主窗口已创建。注册 IPC Controller、flush 冷启动暂存的 deeplink。
 * - Eventually: 应用进入稳态。适合做延迟任务（如空闲时检查更新）。
 */
export enum Phase {
  Starting = 1,
  Ready = 2,
  AfterWindowOpen = 3,
  Eventually = 4,
}

/** Barrier：一次性打开的 Promise。打开后所有 wait() 立即 resolve。 */
class Barrier {
  private opened = false
  private resolveFn!: () => void
  private readonly promise = new Promise<void>((r) => (this.resolveFn = r))

  open(): void {
    if (this.opened) return
    this.opened = true
    this.resolveFn()
  }

  wait(): Promise<void> {
    return this.promise
  }
}

/**
 * 应用生命周期阶段管理。
 *
 * 用法：
 * - 外部模块用 `lifecycle.when(Phase.Ready)` 订阅阶段到达
 * - bootstrap 用 `lifecycle.advance(phase)` 推进阶段
 */
export class Lifecycle {
  private current: Phase = Phase.Starting
  private readonly barriers = new Map<Phase, Barrier>()

  get phase(): Phase {
    return this.current
  }

  /** 返回到达指定阶段的 Promise。已达成立即 resolve。 */
  when(phase: Phase): Promise<void> {
    if (this.current >= phase) return Promise.resolve()
    return this.getBarrier(phase).wait()
  }

  /** 推进到指定阶段。只能单调递增，回退抛错。 */
  advance(phase: Phase): void {
    if (phase <= this.current) {
      throw new Error(`[lifecycle] 阶段不能回退：${Phase[this.current]} → ${Phase[phase]}`)
    }
    log.info(`${Phase[this.current]} → ${Phase[phase]}`)
    this.current = phase
    for (const [p, barrier] of this.barriers) {
      if (p <= phase) barrier.open()
    }
  }

  private getBarrier(phase: Phase): Barrier {
    let b = this.barriers.get(phase)
    if (!b) {
      b = new Barrier()
      this.barriers.set(phase, b)
    }
    return b
  }
}
