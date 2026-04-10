import { useEffect } from "react"

import { useGatewayStore } from "@/stores/gateway"

/**
 * gateway 连接生命周期 hook。
 * 在 App 顶层调用一次：订阅主进程状态推送、同步当前状态、自动扫描本机。
 * 返回连接状态 + connect/disconnect 操作。
 */
export function useGateway() {
  const status = useGatewayStore((s) => s.status)
  const mode = useGatewayStore((s) => s.mode)
  const url = useGatewayStore((s) => s.url)
  const error = useGatewayStore((s) => s.error)
  const set = useGatewayStore((s) => s.set)

  useEffect(() => {
    // 订阅主进程推送的连接状态变化
    const off = window.electron.openclaw.gateway.on.status(set)

    // 同步一次当前状态（hook 挂载前可能已连上）
    window.electron.openclaw.gateway.state().then(set)

    // 空闲时自动扫描本机 gateway
    if (useGatewayStore.getState().status === "idle") {
      window.electron.openclaw.gateway.connect()
    }

    return off
  }, [set])

  return {
    status,
    mode,
    url,
    error,
    connect: window.electron.openclaw.gateway.connect,
    disconnect: window.electron.openclaw.gateway.disconnect,
  }
}
