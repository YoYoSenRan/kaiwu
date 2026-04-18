/**
 * openclaw feature 公开入口。
 *
 * 外部(当前是 app/ipc.ts)从这里拿 Controller 列表注册到 IpcRegistry:
 *
 *   - 静态 Controller(GatewayService / BridgeService / StatusService)直接 re-export
 *   - RPC 域(chat/sessions/agents/models)通过 `domainControllers()` 动态生成
 *
 * 副作用 import `./domains/*` 触发 `domain()` 自注册。新增域:建 `./domains/xxx.ts`,
 * 在本文件加一行 import,无需改核心。
 */

import type { AppContext } from "../../app/context"
import { buildController, registeredDomains } from "./kernel/registry"

import "./domains/agents"
import "./domains/chat"
import "./domains/models"
import "./domains/sessions"

export { GatewayService } from "./gateway/service"
export { BridgeService } from "./bridge/service"
export { StatusService } from "./status/service"

/** 为所有已注册 RPC 域生成 IpcController 构造器。 */
export function domainControllers(): Array<new (ctx: AppContext) => object> {
  return registeredDomains().map(buildController)
}
