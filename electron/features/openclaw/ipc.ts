import type { GatewayConnectParams, InvokeArgs } from "./types"
import type { ChatAbortParams, ChatSendParams, SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams } from "./gateway/contract"

import { safeHandle } from "../../core/ipc"
import { openclawChannels } from "./channels"
import { checkCompat, detect, installBridge, invokePlugin, restartOpenclaw, startBridge, uninstallBridge } from "./core/lifecycle"
import { chatAbort, chatSend, getGatewayState, sessionCreate, sessionDelete, sessionList, sessionPatch, startGatewayConnection, stopGatewayConnection } from "./service"

/**
 * 注册 openclaw feature 的所有 IPC handler，并启动本地 bridge server。
 * 必须在 app.whenReady() 之后、创建主窗口之前调用，以便事件能推到 renderer。
 */
export function setupOpenclaw(): void {
  void startBridge()

  // --- 生命周期 ---
  safeHandle(openclawChannels.lifecycle.detect, () => detect())
  safeHandle(openclawChannels.lifecycle.check, () => checkCompat())
  safeHandle(openclawChannels.lifecycle.restart, () => restartOpenclaw())

  // --- 插件管理 ---
  safeHandle(openclawChannels.plugin.install, () => installBridge())
  safeHandle(openclawChannels.plugin.uninstall, () => uninstallBridge())
  safeHandle(openclawChannels.bridge.invoke, (args) => invokePlugin(args as InvokeArgs))

  // --- gateway ---
  safeHandle(openclawChannels.gateway.state, () => getGatewayState())
  safeHandle(openclawChannels.gateway.connect, (params) => startGatewayConnection(params as GatewayConnectParams | undefined))
  safeHandle(openclawChannels.gateway.disconnect, () => stopGatewayConnection())

  // --- chat ---
  safeHandle(openclawChannels.chat.send, (params) => chatSend(params as ChatSendParams))
  safeHandle(openclawChannels.chat.abort, (params) => chatAbort(params as ChatAbortParams))

  // --- session ---
  safeHandle(openclawChannels.session.create, (params) => sessionCreate(params as SessionCreateParams))
  safeHandle(openclawChannels.session.list, (params) => sessionList(params as SessionListParams))
  safeHandle(openclawChannels.session.patch, (params) => sessionPatch(params as SessionPatchParams))
  safeHandle(openclawChannels.session.delete, (params) => sessionDelete(params as SessionDeleteParams))
}
