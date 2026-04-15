import type { IpcLifecycle } from "./controller"
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron"
import "reflect-metadata"
import { scope } from "../infra/logger"
import { ipcMain } from "electron"
import { CONTROLLER_METADATA, HANDLE_METADATA, ON_METADATA, SENDER_PARAM_METADATA } from "./constants"
import type { AppContext } from "../app/context"

const log = scope("ipc")

type ControllerConstructor = new (ctx: AppContext) => object

/**
 * IPC Controller 注册中心。
 * - register(): 实例化所有 controller → 绑定 @Handle/@On → 等待 onReady
 * - shutdown(): 依次调用所有 controller 的 onShutdown（并发但等待完成）
 */
export class IpcRegistry {
  private static instances: object[] = []

  /**
   * 注册所有 controller。onReady 失败会抛错，中断应用启动。
   * `ctx` 会原样注入到每个 controller 的构造器，让 Controller 能访问主窗口、lifecycle 等运行时依赖。
   */
  static async register(ctx: AppContext, controllers: ControllerConstructor[]): Promise<void> {
    for (const Cls of controllers) {
      const instance = new Cls(ctx)
      this.instances.push(instance)

      const prefix = (Reflect.getMetadata(CONTROLLER_METADATA, Cls) as string | undefined) ?? ""
      const prototype = Object.getPrototypeOf(instance) as object
      this.bindMethods(instance, prototype, prefix)
    }

    // onReady fail-fast：任一失败中断启动，避免半初始化状态
    for (const inst of this.instances) {
      const hook = (inst as IpcLifecycle).onReady
      if (typeof hook === "function") await hook.call(inst)
    }
  }

  /** 统一调用 onShutdown。任一失败不影响其它，记录日志后继续。 */
  static async shutdown(): Promise<void> {
    const tasks = this.instances.map(async (inst) => {
      const hook = (inst as IpcLifecycle).onShutdown
      if (typeof hook !== "function") return
      try {
        await hook.call(inst)
      } catch (err) {
        log.error("[shutdown]", err)
      }
    })
    await Promise.allSettled(tasks)
  }

  private static bindMethods(instance: object, prototype: object, prefix: string): void {
    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === "constructor") continue
      const method = (prototype as Record<string, unknown>)[methodName]
      if (typeof method !== "function") continue

      const handleCh = Reflect.getMetadata(HANDLE_METADATA, prototype, methodName) as string | undefined
      if (handleCh !== undefined) {
        this.bindHandle(this.buildChannel(prefix, handleCh), instance, prototype, methodName)
      }

      const onCh = Reflect.getMetadata(ON_METADATA, prototype, methodName) as string | undefined
      if (onCh !== undefined) {
        this.bindOn(this.buildChannel(prefix, onCh), instance, prototype, methodName)
      }
    }
  }

  private static buildChannel(prefix: string, suffix: string): string {
    return prefix ? `${prefix}:${suffix}` : suffix
  }

  private static bindHandle(channel: string, instance: object, prototype: object, methodName: string): void {
    log.info(`[handle] ${channel}`)
    const senderIndexes = this.senderIndexes(prototype, methodName)
    const fn = (instance as Record<string, unknown>)[methodName] as (...args: unknown[]) => unknown

    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
      try {
        const finalArgs = this.injectSender(args, senderIndexes, event.sender)
        return await fn.apply(instance, finalArgs)
      } catch (err) {
        // 记录完整堆栈（IPC 跨进程会丢 stack），错误 reject 给 renderer
        log.error(`[handle:error] ${channel}`, err)
        throw err
      }
    })
  }

  private static bindOn(channel: string, instance: object, prototype: object, methodName: string): void {
    log.info(`[on] ${channel}`)
    const senderIndexes = this.senderIndexes(prototype, methodName)
    const fn = (instance as Record<string, unknown>)[methodName] as (...args: unknown[]) => void

    ipcMain.on(channel, (event: IpcMainEvent, ...args: unknown[]) => {
      try {
        const finalArgs = this.injectSender(args, senderIndexes, event.sender)
        fn.apply(instance, finalArgs)
      } catch (err) {
        log.error(`[on:error] ${channel}`, err)
      }
    })
  }

  private static senderIndexes(prototype: object, methodName: string): number[] {
    return (Reflect.getMetadata(SENDER_PARAM_METADATA, prototype, methodName) as number[] | undefined) ?? []
  }

  /** 按索引升序插入 sender，保持用户参数顺序。 */
  private static injectSender(args: unknown[], indexes: number[], sender: unknown): unknown[] {
    if (indexes.length === 0) return args
    const result = [...args]
    for (const idx of [...indexes].sort((a, b) => a - b)) {
      result.splice(idx, 0, sender)
    }
    return result
  }
}
