/**
 * 从 OpenClaw plugin SDK 重导出的类型和工厂。
 * 插件内所有文件统一从此处 import，方便未来换源或加适配层。
 */
export {
  definePluginEntry,
  type GatewayStartEvent,
  type GatewayStopEvent,
  type HttpRouteHandler,
  type HttpRouteParams,
  type OpenClawPluginApi,
  type PluginLogger,
} from "openclaw/plugin-sdk/plugin-entry"

export type {
  AnyAgentTool,
  OpenClawPluginToolContext,
  OpenClawPluginToolFactory,
} from "openclaw/plugin-sdk/core"
