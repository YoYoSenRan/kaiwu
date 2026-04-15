import { Controller, Handle, IpcController, type IpcLifecycle } from "../../framework"
import { scope } from "../../infra/logger"
import { agentsCreate, agentsDelete, agentsList, agentsUpdate, modelsList } from "./agent/methods"
import { GatewayRuntime } from "./core/connection"
import { OpenclawRuntime } from "./core/runtime"
import { dispatchMonitorEvent, isMonitorEvent } from "./hook/dispatcher"
import { OpenclawEmitter } from "./push"
import type { GatewayConnectParams, InvokeArgs, OpenclawEvents } from "./types"
import type { AgentsCreateParams, AgentsDeleteParams, AgentsUpdateParams } from "./agent/contract"
import type { ChatAbortParams, ChatSendParams, SessionCreateParams, SessionDeleteParams, SessionListParams, SessionPatchParams } from "./gateway/contract"

const openclawLog = scope("openclaw")

/**
 * OpenClaw feature：gateway 连接、插件管理、Agent/Session/Chat RPC、模型列表。
 *
 * 本类是 IPC 门面，所有业务逻辑下沉到三个协作对象：
 * - `push`：事件推送门面，包装 this.emit
 * - `gateway`：gateway 连接运行时，owns socket/caller/emitter/state
 * - `runtime`：OpenClaw 运行时门面，owns bridge pluginServer，提供 install/detect/invoke 等
 *
 * 三者用字段初始化组合，不写显式构造器 —— 与其他 Controller 保持"零构造器"的形状一致。
 */
@Controller("openclaw")
export class OpenclawService extends IpcController<OpenclawEvents> implements IpcLifecycle {
  private readonly push = new OpenclawEmitter((ch, payload) => this.emit(ch, payload))
  private readonly gateway = new GatewayRuntime(this.push)
  private readonly runtime = new OpenclawRuntime(this.push, this.gateway)

  /**
   * 启动本地 bridge WS server，接收插件事件并分发到 renderer。
   * 放在 onReady 而非构造器：让注册顺序与异步启动解耦，错误由 IpcRegistry 统一 fail-fast。
   */
  async onReady(): Promise<void> {
    try {
      const server = await this.runtime.startBridge()
      if (!server) return
      server.onEvent((event) => {
        if (isMonitorEvent(event)) dispatchMonitorEvent(event, this.push)
        else this.push.pluginEvent(event)
      })
    } catch (err) {
      openclawLog.error("startBridge 失败", err)
    }
  }

  // --- 生命周期 ---

  @Handle("lifecycle:detect")
  detect() {
    return this.runtime.detect()
  }

  @Handle("lifecycle:check")
  check() {
    return this.runtime.checkCompat()
  }

  @Handle("lifecycle:restart")
  restart() {
    return this.runtime.restart()
  }

  // --- 插件管理 ---

  @Handle("plugin:install")
  install() {
    return this.runtime.installPlugin()
  }

  @Handle("plugin:uninstall")
  uninstall() {
    return this.runtime.uninstallPlugin()
  }

  @Handle("plugin:invoke")
  invoke(args: InvokeArgs) {
    return this.runtime.invoke(args)
  }

  // --- gateway ---

  @Handle("gateway:state")
  gatewayState() {
    return this.gateway.getState()
  }

  @Handle("gateway:connect")
  gatewayConnect(params?: GatewayConnectParams) {
    return this.gateway.start(params)
  }

  @Handle("gateway:disconnect")
  gatewayDisconnect() {
    this.gateway.stop()
  }

  // --- chat ---

  @Handle("chat:send")
  chatSend(params: ChatSendParams) {
    return this.gateway.requireCaller().call("chat.send", params)
  }

  @Handle("chat:abort")
  chatAbort(params: ChatAbortParams) {
    return this.gateway.requireCaller().call("chat.abort", params)
  }

  // --- session ---

  @Handle("session:create")
  sessionCreate(params: SessionCreateParams) {
    return this.gateway.requireCaller().call("sessions.create", params)
  }

  @Handle("session:list")
  sessionList(params: SessionListParams) {
    return this.gateway.requireCaller().call("sessions.list", params)
  }

  @Handle("session:patch")
  sessionPatch(params: SessionPatchParams) {
    return this.gateway.requireCaller().call("sessions.patch", params)
  }

  @Handle("session:delete")
  sessionDelete(params: SessionDeleteParams) {
    return this.gateway.requireCaller().call("sessions.delete", params)
  }

  // --- agents ---

  @Handle("agents:list")
  agentsList() {
    return agentsList(this.gateway.requireCaller())
  }

  @Handle("agents:create")
  agentsCreate(params: AgentsCreateParams) {
    return agentsCreate(this.gateway.requireCaller(), params)
  }

  @Handle("agents:update")
  agentsUpdate(params: AgentsUpdateParams) {
    return agentsUpdate(this.gateway.requireCaller(), params)
  }

  @Handle("agents:delete")
  agentsDelete(params: AgentsDeleteParams) {
    return agentsDelete(this.gateway.requireCaller(), params)
  }

  // --- models ---

  @Handle("models:list")
  modelsList() {
    return modelsList(this.gateway.requireCaller())
  }

  /** 应用退出前停止 OpenClaw 插件进程和 gateway 连接。 */
  async onShutdown(): Promise<void> {
    await this.runtime.stopBridge()
  }
}
