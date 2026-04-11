import { safeHandle } from "../../core/ipc"
import { openclawChannels } from "./channels"
import type { GatewayConnectParams, InvokeArgs } from "./types"
import { getGatewayState, requireClient, startGatewayConnection, stopGatewayConnection } from "./core/connection"
import { checkCompat, detect, installPlugin, invokePlugin, restartOpenclaw, startPlugin, uninstallPlugin } from "./core/lifecycle"
import type { ChatAbortParams, ChatSendParams, SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams } from "./gateway/contract"

/**
 * 注册 openclaw feature 的所有 IPC handler，并启动本地 bridge server。
 * 必须在 app.whenReady() 之后、创建主窗口之前调用，以便事件能推到 renderer。
 */
export function setupOpenclaw(): void {
  void startPlugin()

  // --- 生命周期 ---
  safeHandle(openclawChannels.lifecycle.detect, () => detect())
  safeHandle(openclawChannels.lifecycle.check, () => checkCompat())
  safeHandle(openclawChannels.lifecycle.restart, () => restartOpenclaw())

  // --- 插件管理 ---
  safeHandle(openclawChannels.plugin.install, () => installPlugin())
  safeHandle(openclawChannels.plugin.uninstall, () => uninstallPlugin())
  safeHandle(openclawChannels.plugin.invoke, (args) => invokePlugin(args as InvokeArgs))

  // --- gateway ---
  safeHandle(openclawChannels.gateway.state, () => getGatewayState())
  safeHandle(openclawChannels.gateway.connect, (params) => startGatewayConnection(params as GatewayConnectParams | undefined))
  safeHandle(openclawChannels.gateway.disconnect, () => stopGatewayConnection())

  // --- chat ---
  safeHandle(openclawChannels.chat.send, (params) => requireClient().chatSend(params as ChatSendParams))
  safeHandle(openclawChannels.chat.abort, (params) => requireClient().chatAbort(params as ChatAbortParams))

  // --- session ---
  safeHandle(openclawChannels.session.create, (params) => requireClient().sessionCreate(params as SessionCreateParams))
  safeHandle(openclawChannels.session.list, (params) => requireClient().sessionList(params as SessionListParams))
  safeHandle(openclawChannels.session.patch, (params) => requireClient().sessionPatch(params as SessionPatchParams))
  safeHandle(openclawChannels.session.delete, (params) => requireClient().sessionDelete(params as SessionDeleteParams))
}
