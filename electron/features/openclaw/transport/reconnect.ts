import { scope } from "../../../infra/logger"

const log = scope("openclaw:gateway:reconnect")

/** 重连基础间隔(ms),指数退避起点。 */
const BASE_MS = 1_000
/** 重连最大间隔(ms)。 */
const MAX_MS = 15_000
/** jitter 比例,避免雪崩。 */
const JITTER_RATIO = 0.3

export interface ReconnectorHooks {
  /** 排期已确定,值是绝对时间戳(ms since epoch)。 */
  onSchedule: (nextRetryAt: number) => void
  /** 排到的时间到了,执行实际重连。返回 Promise 失败会重新排期。 */
  attempt: () => Promise<void>
}

/**
 * 指数退避 + jitter 的重连排期。
 * 不持有 socket 实例,只控制"什么时候触发 attempt"。
 */
export class Reconnector {
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempts = 0
  private stopped = false

  constructor(private readonly hooks: ReconnectorHooks) {}

  /** 排下一次重连。已有排期或已停止则忽略。 */
  schedule(): void {
    if (this.stopped || this.timer) return
    const delay = Math.min(BASE_MS * Math.pow(1.7, this.attempts), MAX_MS)
    const jitter = Math.random() * delay * JITTER_RATIO
    const total = delay + jitter
    this.attempts++
    log.info(`${Math.round(total)}ms 后重连 (attempt ${this.attempts})`)
    this.hooks.onSchedule(Date.now() + total)
    this.timer = setTimeout(() => {
      this.timer = null
      this.hooks.attempt().catch(() => {
        // attempt 失败由外层处理,这里不再自动重排
      })
    }, total)
  }

  /** 连接成功后调用,清空 attempts 计数。 */
  reset(): void {
    this.attempts = 0
  }

  /** 停止排期(用户主动 disconnect / 认证失败时调用)。 */
  stop(): void {
    this.stopped = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /** 重新启用排期(默认是启用的;停止后想重启用可调)。 */
  resume(): void {
    this.stopped = false
  }
}
