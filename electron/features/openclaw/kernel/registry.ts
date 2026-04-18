/**
 * RPC 域注册中心。
 *
 * 每个 RPC 域(chat / sessions / agents / models / 未来的 documents 等)通过 `domain(spec)`
 * 声明自身的 namespace + 方法映射。注册表收集所有域描述,
 * `buildController(d)` 为每个域动态生成一个 IpcController 类,实现:
 *
 *   - `Reflect.defineMetadata(CONTROLLER_METADATA, namespace, Cls)`
 *   - 每个方法装到 `Cls.prototype`
 *   - `Reflect.defineMetadata(HANDLE_METADATA, name, Cls.prototype, name)`
 *   - `emit` 方法由 prototype 安装,使动态 Controller 与 `@Controller` 装饰器等价
 *
 * framework/registry.ts 的 `IpcRegistry.register` 按 metadata 扫描方法并绑 `ipcMain.handle`,
 * 无需改 framework。
 *
 * 新增域 = 新增 `domains/xxx.ts` + 在 `index.ts` 副作用 import。不改 core。
 */

import "reflect-metadata"
import type { AppContext } from "../../../app/context"
import type { GatewayClient } from "../gateway/client"
import { CONTROLLER_METADATA, HANDLE_METADATA, IpcController, resolveIpcEmitTarget } from "../../../framework"
import { getGateway } from "../runtime"

/** 域内单方法的处理函数。收到 IPC 参数,走 gateway.call 转发并返回结果。 */
export type Handler<P, R> = (gateway: GatewayClient, params: P) => Promise<R>

/** 域声明。namespace 作为 IPC channel 前缀,methods 的 key 即子 channel 名。 */
export interface DomainSpec<M extends Record<string, Handler<any, any>>> {
  namespace: string
  methods: M
}

export interface Domain<M = Record<string, Handler<any, any>>> {
  readonly namespace: string
  readonly methods: M
}

const registry: Domain[] = []

/**
 * 声明一个 RPC 域并登记到注册表。
 * 幂等:同名 namespace 重复注册保留首次,后注册忽略并 warn。
 */
export function domain<M extends Record<string, Handler<any, any>>>(spec: DomainSpec<M>): Domain<M> {
  const existing = registry.find((d) => d.namespace === spec.namespace)
  if (existing) return existing as Domain<M>
  const d: Domain<M> = { namespace: spec.namespace, methods: spec.methods }
  registry.push(d as Domain)
  return d
}

/** 返回已注册域列表的只读快照。 */
export function registeredDomains(): ReadonlyArray<Domain> {
  return registry
}

/** IpcRegistry 期望的构造器签名。 */
type ControllerConstructor = new (ctx: AppContext) => object

/**
 * 为一个域动态生成 IpcController 类。
 * 生成结果与 `@Controller(ns) class Foo { @Handle(m) foo() {} }` 等价,
 * 把 metadata 直接写到 prototype,跳过装饰器语法层。
 */
export function buildController(d: Domain): ControllerConstructor {
  class AutoController extends IpcController {}

  Reflect.defineMetadata(CONTROLLER_METADATA, d.namespace, AutoController)

  Object.defineProperty(AutoController.prototype, "emit", {
    configurable: true,
    enumerable: false,
    writable: false,
    value(channel: string, payload?: unknown): void {
      const full = d.namespace ? `${d.namespace}:${channel}` : channel
      resolveIpcEmitTarget()?.send(full, payload)
    },
  })

  for (const [name, handler] of Object.entries(d.methods)) {
    ;(AutoController.prototype as unknown as Record<string, unknown>)[name] = function (params: unknown) {
      return handler(getGateway(), params)
    }
    Reflect.defineMetadata(HANDLE_METADATA, name, AutoController.prototype, name)
  }

  Object.defineProperty(AutoController, "name", { value: classNameFromNamespace(d.namespace) })
  return AutoController as ControllerConstructor
}

/** `openclaw.chat` → `ChatController`,用于日志/调试时类名可读。 */
function classNameFromNamespace(namespace: string): string {
  const last = namespace.split(".").pop() ?? "Auto"
  return `${last.charAt(0).toUpperCase()}${last.slice(1)}Controller`
}
