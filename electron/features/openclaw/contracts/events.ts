/**
 * openclaw 内部事件总线 schema。
 *
 * 所有跨域订阅都走此 union,发射/订阅的 channel 与 payload 由 TS 检查。
 * 新增事件在此加一行即可,发射点与订阅点编译期守门。
 *
 * renderer 侧推送另走 events/publisher.ts 的声明式路由(bus → IPC channel),
 * 本 union 是主进程内的领域事件,不等同于 IPC channel。
 */

import type { ConnectionState } from "./connection"
import type { EventFrame } from "../gateway/contract"
import type { MonitorEvent, PluginEvent } from "./plugin"
import type { OpenClawStatus } from "./status"

export interface BusEvents {
  /** gateway 连接状态快照变化。 */
  "gateway.state": ConnectionState
  /** gateway 事件帧(业务事件,如 chat.chunk / agent.step)。 */
  "gateway.event": EventFrame
  /** gateway 进入 connected。无 payload。 */
  "gateway.connected": void
  /** gateway 从 connected 转出。无 payload。 */
  "gateway.disconnected": void

  /** 本地 bridge WS server 启动完成,附当前凭证。 */
  "bridge.started": { port: number; token: string }
  /** 本地 bridge WS server 已停止。 */
  "bridge.stopped": void
  /** kaiwu 插件文件同步完成(install)。 */
  "bridge.installed": OpenClawStatus
  /** kaiwu 插件文件已移除(uninstall)。 */
  "bridge.uninstalled": OpenClawStatus

  /** 来自已连接 kaiwu 插件的 custom/lifecycle 事件。 */
  "plugin.event": PluginEvent
  /** 来自已连接 kaiwu 插件的监控采样(llm_input / tool_call 等)。 */
  "plugin.monitor": MonitorEvent

  /** OpenClaw 整体状态变化(scanner + bridge 聚合后)。 */
  "status.change": OpenClawStatus
}
