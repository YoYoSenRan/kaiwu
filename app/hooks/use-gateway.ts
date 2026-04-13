import { useEffect } from "react"
import { useGatewayStore } from "@/stores/gateway"

/**
 * gateway 连接状态订阅 hook。
 * 订阅主进程推送的连接状态变化 + 挂载时同步当前状态快照。
 * **不触发连接动作**——bootstrap 扫描由 App 顶层显式调用 connect()。
 * 返回状态字段 + connect/disconnect 操作供业务组件使用。
 */
export function useGateway() {
  const status = useGatewayStore((s) => s.status)
  const mode = useGatewayStore((s) => s.mode)
  const url = useGatewayStore((s) => s.url)
  const error = useGatewayStore((s) => s.error)
  const set = useGatewayStore((s) => s.set)

  useEffect(() => {
    const off = window.electron.openclaw.gateway.on.status(set)
    // 订阅后立即同步一次：hook 挂载前主进程可能已推送过状态
    window.electron.openclaw.gateway.state().then(set)
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
