/**
 * context 能力域的 setup 入口。
 * 注册 stage.set / stage.clear action 和 before_prompt_build hook。
 */

import type { DomainContext } from "../domain.js"

import { registerAction } from "../core/http.js"
import { createPromptHook } from "./hook.js"
import { handleStageClear, handleStageSet } from "./route.js"

/**
 * 初始化 context 域：注册 action handler 和 prompt 注入 hook。
 * @param ctx 域基础设施
 */
export function setupContext(ctx: DomainContext): void {
  // 注册到域前缀 "context.set" / "context.clear"
  ctx.registerAction("set", handleStageSet)
  ctx.registerAction("clear", handleStageClear)

  // 兼容旧前缀 "stage.set" / "stage.clear"（kaiwu 主进程调用路径暂未迁移）
  registerAction("stage.set", handleStageSet)
  registerAction("stage.clear", handleStageClear)

  // agent 每轮推理前注入阶段上下文
  ctx.api.on("before_prompt_build", createPromptHook())
}
