"use client"

/**
 * Gateway 连接管理 Hook
 * React 组件访问 Gateway 的唯一入口
 */

import { useCallback, useEffect, useRef } from "react"
import { useGatewayStore } from "@/stores/gateway"
import { GatewayWebSocket } from "@/lib/gateway/websocket"
import { loadCredentials, saveCredentials, clearCredentials } from "@/lib/gateway/credentials"
import type { GatewayStatus, GatewayEvent, GatewayInfo } from "@/types/gateway"

/** WebSocket 客户端单例，跨 hook 挂载共享 */
const clientRef: { current: GatewayWebSocket | null } = { current: null }

export interface UseGatewayReturn {
  status: GatewayStatus
  latency: number | null
  error: string | null
  connect: (url: string, token: string) => void
  disconnect: () => void
  isConnected: boolean
}

export function useGateway(): UseGatewayReturn {
  const status = useGatewayStore((s) => s.status)
  const latency = useGatewayStore((s) => s.latency)
  const error = useGatewayStore((s) => s.error)
  const store = useGatewayStore

  // 追踪是否已尝试过自动恢复连接
  const autoConnectAttempted = useRef(false)

  /** 获取或创建 WebSocket 客户端单例 */
  const getClient = useCallback((): GatewayWebSocket => {
    if (clientRef.current) return clientRef.current

    const client = new GatewayWebSocket({
      onStatusChange: (newStatus: GatewayStatus) => {
        store.getState().setStatus(newStatus)
      },
      onMessage: (_message: GatewayEvent) => {
        // 业务事件分发将在后续模块中实现
      },
      onError: (errorMsg: string) => {
        store.getState().setError(errorMsg)
      },
      onLatency: (ms: number) => {
        store.getState().setLatency(ms)
      },
      onReconnectAttempt: (attempt: number) => {
        store.getState().setReconnectAttempt(attempt)
      },
      onGatewayInfo: (info: GatewayInfo) => {
        // Gateway 信息已在 WebSocket 内部处理了 deviceToken 缓存
        // 这里可以扩展用于其他场景
        void info
      },
    })

    clientRef.current = client
    return client
  }, [store])

  /** 连接到 Gateway */
  const connect = useCallback(
    (url: string, token: string) => {
      console.log("[useGateway] connect() url:", url, "token长度:", token.length)
      const client = getClient()
      const creds = loadCredentials()

      store.getState().setUrl(url)
      store.getState().setError(null)

      client.connect(url, token, creds?.deviceToken)

      // 连接发起后保存凭据（连接成功后 deviceToken 会自动更新）
      saveCredentials({ url, token, deviceToken: creds?.deviceToken })
    },
    [getClient, store]
  )

  /** 断开连接 */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
    clearCredentials()
    store.getState().reset()
  }, [store])

  // 组件挂载时尝试从 localStorage 恢复连接
  useEffect(() => {
    if (autoConnectAttempted.current) return
    autoConnectAttempted.current = true

    const creds = loadCredentials()
    if (creds) {
      const client = getClient()
      store.getState().setUrl(creds.url)
      client.connect(creds.url, creds.token, creds.deviceToken)
    }
  }, [getClient, store])

  return { status, latency, error, connect, disconnect, isConnected: status === "connected" }
}
