import { scope } from "../../infra/logger"
import type { GatewayEventFrame, GatewayState, OpenClawStatus, OpenclawEvents, PluginEvent } from "./types"

const pushLog = scope("openclaw:push")

/**
 * 向 renderer 推送事件的函数签名。与 IpcController<OpenclawEvents>.emit 对齐，
 * 确保每次 push 都经过编译期的 channel + payload 类型校验。
 */
type EmitFn = <K extends keyof OpenclawEvents & string>(channel: K, payload: OpenclawEvents[K]) => void

/**
 * OpenClaw 事件推送门面。
 *
 * 封装对 `IpcController.emit` 的调用，按事件种类提供语义化方法。
 * 由 OpenclawService 在构造时创建并注入给 core/gateway/hook 等非 class 组件，
 * 替代之前 "模块级 emitFn + attachEmitter/detachEmitter 握手" 的反模式。
 */
export class OpenclawEmitter {
  constructor(private readonly emit: EmitFn) {}

  pluginEvent(event: PluginEvent): void {
    this.emit("plugin:event", event)
  }

  pluginMonitor(event: OpenclawEvents["plugin:monitor"]): void {
    this.emit("plugin:monitor", event)
  }

  pluginStatus(status: OpenClawStatus): void {
    this.emit("plugin:status", status)
  }

  gatewayState(state: GatewayState): void {
    this.emit("gateway:status", state)
  }

  gatewayEvent(frame: GatewayEventFrame): void {
    pushLog.debug(`gateway 事件: ${frame.event}`)
    this.emit("gateway:event", frame)
  }
}
