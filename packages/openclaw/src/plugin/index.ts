/**
 * 开物局 OpenClaw Plugin 注册入口
 *
 * 通过 api.registerTool() 将自建工具注册到 Gateway，
 * Agent 可通过 tools.allow 配置按角色访问。
 */
import { allTools } from "./tool-defs"

/** OpenClaw Plugin 注册函数 — 导出为默认函数供 Gateway 加载 */
export default function register(api: {
  registerTool: (
    def: { name: string; description: string; parameters: unknown; execute: (id: string, params: Record<string, unknown>) => Promise<unknown> },
    options?: { optional?: boolean }
  ) => void
}): void {
  for (const tool of allTools) {
    api.registerTool({ name: tool.name, description: tool.description, parameters: tool.parameters, execute: tool.execute }, { optional: tool.optional ?? true })
  }
}
