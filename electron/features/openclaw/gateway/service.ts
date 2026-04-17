import type { IpcLifecycle } from "../../../framework"
import type { ConnectParams, EventFrame, ConnectionState } from "./types"
import { Controller, Handle, IpcController } from "../../../framework"
import { GatewayClient } from "./client"
import { extractSessionKey } from "./manager"
import { emitGatewayEvent, emitGatewayStatus, setGateway } from "../container"

/**
 * gateway 连接管理 Controller。
 *
 * 职责:
 *   - 持有唯一的 GatewayClient 实例,onReady 时 set 到 container 供 RPC services 使用
 *   - 对外暴露 3 个 Handle: state / connect / disconnect
 *   - 注册业务层事件名 → key extractor 映射(chat/agent 都按 sessionKey 路由)
 *
 * GatewayClient 的 onStatus / onEvent 回调通过 container.emitGatewayStatus / emitGatewayEvent
 * 直接推送到 renderer,不走 this.emit(避免和其他 Controller 的 emit 前缀耦合)。
 */
@Controller("openclaw.gateway")
export class GatewayService extends IpcController implements IpcLifecycle {
  private readonly gateway = new GatewayClient({
    onStatus: emitGatewayStatus,
    onEvent: emitGatewayEvent,
    onEmitterReady: (emitter) => {
      emitter.registerKeyExtractor("chat", extractSessionKey)
      emitter.registerKeyExtractor("agent", extractSessionKey)
    },
  })

  /** 把 gateway 实例挂到 container,RPC services 的 @Handle 里 getGateway() 才能读到。 */
  onReady(): void {
    setGateway(this.gateway)
  }

  /** 返回当前连接状态快照(同步读)。 */
  @Handle("state")
  state(): ConnectionState {
    return this.gateway.getState()
  }

  /**
   * 连接 gateway。无参数走扫描模式(扫描本机 + 10s 轮询),有参数走手动直连。
   * @param params 可选的手动连接参数(url + 可选 token/password)
   */
  @Handle("connect")
  connect(params?: ConnectParams): Promise<void> {
    return this.gateway.connect(params)
  }

  /** 主动断开连接并清除扫描定时器,回到 idle 状态。 */
  @Handle("disconnect")
  disconnect(): void {
    this.gateway.disconnect()
  }

  /** 应用退出时调用,关闭 WS socket 释放资源。 */
  onShutdown(): void {
    this.gateway.disconnect()
  }
}

/** 从 gateway/types.ts 转发 2 个常用类型,让 container.ts / bridge.ts 有一个稳定的导入入口。 */
export type { EventFrame, ConnectionState }
