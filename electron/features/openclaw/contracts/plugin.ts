/**
 * kaiwu bridge 插件与 openclaw 交互的契约类型。
 *
 * 镜像 `plugins/kaiwu/src/protocol.ts` 与 `plugins/kaiwu/src/monitor/contract.ts`。
 */

/** 调用 `/kaiwu/invoke` 的参数。 */
export interface InvokeArgs {
  action: string
  params?: unknown
}

/** `/kaiwu/invoke` 的响应。 */
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

/** 插件采集的运行时监控事件(镜像 plugins/kaiwu/src/monitor/contract.ts MonitorEvent)。 */
export interface MonitorEvent {
  hookName: string
  event: unknown
  ctx: { sessionKey?: string; agentId?: string; runId?: string }
  ts: number
}

/** bridge server 鉴权凭证,由 LocalBridgeServer.getCredentials() 返回。 */
export interface ServerCredentials {
  port: number
  token: string
  pid: number
}
