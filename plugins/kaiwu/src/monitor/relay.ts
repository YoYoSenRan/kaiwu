/**
 * 将 collector 采集到的 MonitorEvent 通过 bridge WS 转发给 kaiwu 主进程。
 *
 * 使用已有的 custom 事件通道（envelope.ts 的 CustomEvent），
 * channel 固定为 "monitor"，data 为 MonitorEvent。
 * 主进程侧的 dispatcher 按此 channel 过滤和分发。
 */

import type { BridgeClient } from "../core/transport.js"
import { makeEvent } from "../core/envelope.js"
import type { MonitorEvent } from "./contract.js"
import { MONITOR_CHANNEL } from "./contract.js"

/**
 * 创建 monitor sink——collector 采集到事件后调用此函数转发。
 * @param client bridge WS 客户端实例
 */
export function createMonitorSink(client: BridgeClient): (event: MonitorEvent) => void {
  return (event) => {
    client.send(makeEvent("custom", { channel: MONITOR_CHANNEL, data: event }))
  }
}
