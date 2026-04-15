/**
 * Gateway RPC 请求-响应层。
 * 职责：发送 RPC 请求、匹配响应帧、超时管理。
 * 不关心连接细节——通过 GatewaySocket 收发帧。
 */

import type { GatewaySocket } from "./socket"
import type { ResponseFrame } from "./contract"

/** RPC 请求默认超时（ms）。 */
const DEFAULT_TIMEOUT_MS = 15_000

type PendingReq = {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * RPC 调用客户端。
 * 绑定一个 GatewaySocket，监听 res 帧做请求-响应匹配。
 */
export class GatewayCaller {
  private idCounter = 0
  private readonly pending = new Map<string, PendingReq>()

  constructor(private readonly socket: GatewaySocket) {
    // 监听所有入站帧，只处理 type === "res"
    socket.onFrame((frame) => {
      if (frame.type === "res") this.handleResponse(frame as ResponseFrame)
    })

    // 连接断开时拒绝所有待处理请求
    socket.onConnectionChange((connected) => {
      if (!connected) this.rejectAll("connection closed")
    })
  }

  /**
   * 发送 RPC 请求并等待响应。
   * @param method RPC 方法名
   * @param params 请求参数
   * @param timeoutMs 超时时间（ms）
   */
  call(method: string, params?: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `k${++this.idCounter}`
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      try {
        this.socket.send({ type: "req", id, method, params })
      } catch (err) {
        this.pending.delete(id)
        clearTimeout(timer)
        reject(err)
      }
    })
  }

  private handleResponse(frame: ResponseFrame): void {
    const req = this.pending.get(frame.id)
    if (!req) return
    this.pending.delete(frame.id)
    clearTimeout(req.timer)
    if (frame.ok) req.resolve(frame.payload)
    else req.reject(new Error(frame.error?.message ?? "RPC error"))
  }

  private rejectAll(reason: string): void {
    for (const [, req] of this.pending) {
      clearTimeout(req.timer)
      req.reject(new Error(reason))
    }
    this.pending.clear()
  }
}
