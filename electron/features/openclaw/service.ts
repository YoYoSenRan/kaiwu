import { Controller, Handle, IpcController } from "../../framework"
import type { IpcLifecycle } from "../../framework"
import * as agent from "./agent/methods"
import * as chat from "./chat/methods"
import * as model from "./model/methods"
import * as session from "./session/methods"
import { GatewayClient } from "./gateway/client"
import { PluginHost } from "./plugin/host"
import { detectGateway } from "./gateway/detection"
import { invoke } from "./plugin/invoke"
import { toMonitorEvent } from "./plugin/dispatcher"
import { checkCompatibility, detectStatus, installBridge, restartGateway, uninstallBridge } from "./plugin/lifecycle"
import type { ChatAbortParams, ChatSendParams } from "./chat/contract"
import type { SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams } from "./session/contract"
import type { AgentsCreateParams, AgentsDeleteParams, AgentsUpdateParams } from "./agent/contract"
import type { GatewayConnectParams } from "./gateway/types"
import type { InvokeArgs } from "./plugin/types"
import type { EmitEvent, OpenclawEvents } from "./types"

/**
 * OpenClaw feature：gateway 连接、插件管理、Agent/Session/Chat RPC、模型列表。
 *
 * 本类是 IPC 门面，业务逻辑下沉到两个协作对象：
 * - `gateway`:gateway 连接运行时,owns socket/caller/emitter/state,未连接时 call 抛错
 * - `host`:本地 bridge WS server 生命周期,owns pluginServer
 *
 * 插件 install/uninstall/detect/invoke/restart/checkCompatibility 是 plugin/lifecycle.ts 里的纯函数,
 * 由本 service 的 @Handle 方法直接调用,不再封装成类。
 *
 * `emitEvent` 是类型化的 `this.emit` 包装,注入给协作者使用。
 */
@Controller("openclaw")
export class OpenclawService extends IpcController<OpenclawEvents> implements IpcLifecycle {
  private readonly emitEvent: EmitEvent = (channel, payload) => this.emit(channel, payload)
  private readonly gateway = new GatewayClient(this.emitEvent)
  private readonly host = new PluginHost()

  /**
   * 启动本地 bridge WS server,接收插件事件并分发到 renderer。
   * 放在 onReady 而非构造器:让注册顺序与异步启动解耦,错误由 IpcRegistry 统一 fail-fast。
   */
  async onReady(): Promise<void> {
    const server = await this.host.start()
    if (server) {
      server.onEvent((event) => {
        const monitor = toMonitorEvent(event)
        if (monitor) this.emit("plugin:monitor", monitor)
        else this.emit("plugin:event", event)
      })
    }
  }

  // --- 生命周期 ---

  @Handle("lifecycle:detect")
  detect() {
    return detectStatus(this.emitEvent)
  }

  @Handle("lifecycle:check")
  check() {
    return checkCompatibility()
  }

  @Handle("lifecycle:restart")
  restart() {
    return restartGateway()
  }

  @Handle("lifecycle:capabilities")
  capabilities() {
    return detectGateway().then((g) => g.capabilities)
  }

  // --- 插件管理 ---

  @Handle("plugin:install")
  install() {
    const server = this.host.getServer()
    const creds = server ? { port: server.info.port, token: server.info.token, pid: server.info.pid } : null
    return installBridge(creds, this.emitEvent)
  }

  @Handle("plugin:uninstall")
  uninstall() {
    return uninstallBridge(this.emitEvent)
  }

  @Handle("plugin:invoke")
  invoke(args: InvokeArgs) {
    const token = this.host.getServer()?.info.token ?? null
    return invoke(token, args)
  }

  // --- gateway ---

  @Handle("gateway:state")
  gatewayState() {
    return this.gateway.getState()
  }

  @Handle("gateway:connect")
  gatewayConnect(params?: GatewayConnectParams) {
    return this.gateway.connect(params)
  }

  @Handle("gateway:disconnect")
  gatewayDisconnect() {
    this.gateway.disconnect()
  }

  // --- chat ---

  @Handle("chat:send")
  send(params: ChatSendParams) {
    return chat.send(this.gateway, params)
  }

  @Handle("chat:abort")
  abort(params: ChatAbortParams) {
    return chat.abort(this.gateway, params)
  }

  // --- session ---

  @Handle("session:create")
  createSession(params: SessionCreateParams) {
    return session.create(this.gateway, params)
  }

  @Handle("session:list")
  listSessions(params: SessionListParams) {
    return session.list(this.gateway, params)
  }

  @Handle("session:patch")
  updateSession(params: SessionPatchParams) {
    return session.update(this.gateway, params)
  }

  @Handle("session:delete")
  deleteSession(params: SessionDeleteParams) {
    return session.remove(this.gateway, params)
  }

  // --- agents ---

  @Handle("agents:list")
  listAgents() {
    return agent.list(this.gateway)
  }

  @Handle("agents:create")
  createAgent(params: AgentsCreateParams) {
    return agent.create(this.gateway, params)
  }

  @Handle("agents:update")
  updateAgent(params: AgentsUpdateParams) {
    return agent.update(this.gateway, params)
  }

  @Handle("agents:delete")
  deleteAgent(params: AgentsDeleteParams) {
    return agent.remove(this.gateway, params)
  }

  // --- models ---

  @Handle("models:list")
  listModels() {
    return model.list(this.gateway)
  }

  /** 应用退出前停止本地 WS server 和 gateway 连接。 */
  async onShutdown(): Promise<void> {
    this.gateway.disconnect()
    // 2s 上限避免阻塞 before-quit;plugin WS server 卡住也能放行。
    await Promise.race([this.host.stop(), new Promise<void>((resolve) => setTimeout(resolve, 2000))])
  }
}
