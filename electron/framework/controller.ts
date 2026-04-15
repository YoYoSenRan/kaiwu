import type { WebContents } from "electron"
import type { AppContext } from "../app/context"

/**
 * IPC Controller 的生命周期钩子契约。按需实现。
 * - onReady: 注册完成后调用。异常会中断应用启动（fail-fast）。
 * - onShutdown: 应用退出前调用，用于释放资源。
 *
 * 命名带 `Ipc` 前缀以避免与 framework/lifecycle.ts 的 `Lifecycle`（阶段管理类）冲突。
 */
export interface IpcLifecycle {
  onReady?(): void | Promise<void>
  onShutdown?(): void | Promise<void>
}

/**
 * IPC Controller 基类。
 *
 * 泛型 `Events` 声明该 controller 可推送的事件映射表（channel → payload 类型），
 * 用法：`class FooService extends IpcController<FooEvents>`，
 * 之后 `this.emit("xxx", payload)` 会在编译期校验 channel 拼写和 payload 类型。
 *
 * 实际 emit 实现由 @Controller 装饰器在类 prototype 上安装，
 * 基类这里的实现仅在未装饰时提供可读的错误提示。
 *
 * `ctx` 由 IpcRegistry.register 在实例化时注入，所有 Controller 统一走这条路径拿到主窗口
 * 等运行时依赖，取代以前的 module-level `getMainWindow` shim。
 */
export abstract class IpcController<Events extends object = Record<string, never>> {
  constructor(protected readonly ctx: AppContext) {}

  protected emit<K extends keyof Events & string>(_channel: K, _payload: Events[K]): void {
    throw new Error("[ipc] emit 未初始化：类需用 @Controller() 装饰")
  }
}

/** webContents 解析器：由 app 层在启动时注入。 */
type WebContentsResolver = () => WebContents | null

let resolver: WebContentsResolver = () => null

/**
 * app 启动时调用，告知框架向哪个 webContents 推送事件。
 * 必须在 IpcRegistry.register 之前调用。
 */
export function setIpcEmitHost(fn: WebContentsResolver): void {
  resolver = fn
}

/** @internal 供 @Controller 装饰器内部使用。 */
export function resolveIpcEmitTarget(): WebContents | null {
  return resolver()
}
