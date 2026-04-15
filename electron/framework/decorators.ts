import "reflect-metadata"
import { resolveIpcEmitTarget } from "./controller"
import { CONTROLLER_METADATA, HANDLE_METADATA, ON_METADATA, SENDER_PARAM_METADATA } from "./constants"

/**
 * 标记类为 IPC Controller。
 * 同时在 prototype 上安装 `emit(channel, payload)` 方法，
 * channel 自动拼接 `${prefix}:` 前缀。
 * @param prefix Channel 前缀，例如 "knowledge"
 */
export function Controller(prefix: string = ""): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(CONTROLLER_METADATA, prefix, target)
    Object.defineProperty(target.prototype, "emit", {
      configurable: true,
      enumerable: false,
      writable: false,
      value: function (channel: string, payload?: unknown): void {
        const full = prefix ? `${prefix}:${channel}` : channel
        resolveIpcEmitTarget()?.send(full, payload)
      },
    })
  }
}

/**
 * 标记方法为 Request-Reply 处理函数（对应 ipcMain.handle）。
 * @param channel 子渠道名
 */
export function Handle(channel: string): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(HANDLE_METADATA, channel, target, propertyKey)
  }
}

/**
 * 标记方法为 One-Way 通知处理函数（对应 ipcMain.on）。
 * @param channel 子渠道名
 */
export function On(channel: string): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(ON_METADATA, channel, target, propertyKey)
  }
}

/**
 * 参数装饰器：将当前请求的 WebContents sender 注入到对应位置。
 * 无需声明时完全省略。用于跨窗口按请求源推送（单窗口下可直接用 this.emit）。
 *
 * @example
 *   async upload(@Sender() sender: WebContents, kbId: string) { ... }
 */
export function Sender(): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return
    const existing = (Reflect.getMetadata(SENDER_PARAM_METADATA, target, propertyKey) as number[] | undefined) ?? []
    existing.push(parameterIndex)
    Reflect.defineMetadata(SENDER_PARAM_METADATA, existing, target, propertyKey)
  }
}
