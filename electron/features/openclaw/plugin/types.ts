/**
 * plugin 域本地类型:本机侦测状态、兼容性、call 入出参、插件事件。
 */

import type { ScanResult } from "../gateway/types"

/** OpenClaw 当前状态:gateway 扫描结果 + kaiwu 插件安装状态。 */
export interface OpenClawStatus extends ScanResult {
  /** 插件是否已同步到 extensionsDir。 */
  bridgeInstalled: boolean
  /** 已安装插件的版本(读 目标路径 package.json)。 */
  installedBridgeVersion: string | null
}

/** 兼容性检查结果。 */
export interface CompatibilityResult {
  compatible: boolean
  /** host 版本。 */
  hostVersion: string | null
  /** 插件声明的 pluginApi 范围。 */
  pluginApiRange: string
  /** 不兼容时的人类可读原因。 */
  reason?: string
  /** 已知会影响第三方插件的 breaking change 列表。 */
  knownBreaking: { version: string; change: string }[]
}

/** 调用 /kaiwu/invoke 的参数。 */
export interface InvokeArgs {
  action: string
  params?: unknown
}

/** /kaiwu/invoke 的响应。 */
export interface InvokeResult {
  ok: boolean
  result?: unknown
  error?: { message: string; code?: string }
}

/** 来自 kaiwu 插件的 custom 事件。 */
export interface PluginCustomEvent {
  type: "custom"
  id?: string
  ts: number
  payload: unknown
}

/** 来自 kaiwu 插件的 lifecycle 事件。 */
export interface PluginLifecycleEvent {
  type: "lifecycle"
  id?: string
  ts: number
  data: unknown
}

/** 来自 kaiwu 插件的事件(镜像 plugins/kaiwu/src/protocol.ts)。 */
export type PluginEvent = PluginCustomEvent | PluginLifecycleEvent

/** 插件采集的运行时监控事件,镜像 plugins/kaiwu/src/monitor/contract.ts 的 MonitorEvent。 */
export interface MonitorEvent {
  hookName: string
  event: unknown
  ctx: { sessionKey?: string; agentId?: string; runId?: string }
  ts: number
}

/** bridge server 鉴权所需的凭证片段,由 BridgeServer.getCredentials() 返回。 */
export interface ServerCredentials {
  port: number
  token: string
  pid: number
}
