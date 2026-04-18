/**
 * chat 能力域的 setup 入口。
 * 注册两个 agent 工具（mention_next / ask_user），工具调用时通过 bridge 推事件给 kaiwu。
 */

import type { DomainContext } from "../domain.js"
import { createAskUserFactory, createMentionNextFactory } from "./tools.js"

/** 初始化 chat 域。 */
export function setupChat(ctx: DomainContext): void {
  ctx.api.registerTool(createMentionNextFactory(ctx.bridge))
  ctx.api.registerTool(createAskUserFactory(ctx.bridge))
}
