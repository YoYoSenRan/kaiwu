import type { default as WebSocketImpl } from "ws"
import { scope } from "../../../infra/logger"

const log = scope("openclaw:gateway:heartbeat")

/** 心跳 ping 间隔(ms)。 */
const PING_INTERVAL_MS = 15_000
/** 连续没收到 pong 的容忍时长(ms)。3 × ping 间隔容忍单次丢包。 */
const PONG_TIMEOUT_MS = 45_000

export interface HeartbeatHooks {
  /** 测得一次 pong 延迟时回调,单位 ms。 */
  onLatency: (ms: number) => void
  /** pong 超时,需要外层强制重连。 */
  onTimeout: () => void
}

/**
 * WS 心跳保活。
 * 周期 ping,超时 pong 触发 onTimeout 让外层 terminate。
 */
export class Heartbeat {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastPongAt = 0
  private lastPingSentAt = 0

  constructor(private readonly hooks: HeartbeatHooks) {}

  /** 绑定到一个已 open 的 WS,开始 ping/pong 循环。 */
  start(ws: WebSocketImpl): void {
    this.stop()
    this.lastPongAt = Date.now()
    this.lastPingSentAt = 0

    ws.on("pong", () => {
      this.lastPongAt = Date.now()
      if (this.lastPingSentAt > 0) {
        this.hooks.onLatency(this.lastPongAt - this.lastPingSentAt)
      }
    })

    this.timer = setInterval(() => {
      if (ws.readyState !== ws.OPEN) return
      if (Date.now() - this.lastPongAt > PONG_TIMEOUT_MS) {
        log.warn(`Pong 超时 ${PONG_TIMEOUT_MS}ms,强制重连`)
        this.hooks.onTimeout()
        return
      }
      this.lastPingSentAt = Date.now()
      ws.ping()
    }, PING_INTERVAL_MS)
  }

  /** 停止 ping。reconnect 之间或断开时调用。 */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
