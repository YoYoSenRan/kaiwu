import type { DeploymentKind, Capabilities } from "./types"
import { readProcessCmdline, type LiveLockInfo } from "./lock"

/**
 * 根据探测结果和 lock 信息推断 OpenClaw 部署形态。
 */
export function inferDeployment(
  base: {
    installed: boolean
    running: boolean
    detectedBy: string | null
    gatewayPort: number | null
  },
  liveLock: LiveLockInfo | null,
): DeploymentKind {
  if (liveLock) {
    const args = readProcessCmdline(liveLock.pid)
    const cmdline = args?.join(" ") ?? ""
    if (/docker/i.test(cmdline)) return "docker"
    return "local"
  }

  if (base.running && base.gatewayPort && !base.detectedBy) {
    return "remote"
  }

  if (base.installed) return "local"
  return "unknown"
}

/**
 * 根据部署形态计算 kaiwu 各功能的可用性。
 */
export function computeCapabilities(deployment: DeploymentKind): Capabilities {
  const caps: Capabilities = {
    gatewayRpc: true,
    pluginBridge: false,
    pluginSync: false,
    pluginInvoke: false,
    agentWorkspaceLocal: false,
    canRestart: false,
  }

  if (deployment === "local") {
    caps.pluginBridge = true
    caps.pluginSync = true
    caps.pluginInvoke = true
    caps.agentWorkspaceLocal = true
    caps.canRestart = true
  }

  if (deployment === "docker") {
    caps.pluginBridge = true
    caps.pluginSync = true
    caps.pluginInvoke = true
    caps.agentWorkspaceLocal = true
  }

  return caps
}
