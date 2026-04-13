/**
 * monitor 能力域的 setup 入口。
 * 订阅 OpenClaw 运行时 hook，通过 bridge WS 转发给 kaiwu 主进程。
 */

import type { DomainContext } from "../domain.js"

import { setupCollector } from "./collector.js"
import { createMonitorSink } from "./relay.js"

/**
 * 初始化 monitor 域：注册 hook 事件采集器。
 * @param ctx 域基础设施
 */
export function setupMonitor(ctx: DomainContext): void {
  setupCollector(ctx.api.on.bind(ctx.api), createMonitorSink(ctx.bridge))
}
