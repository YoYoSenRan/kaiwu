import type { AppContext } from "../app/context"
import type { Phase } from "./lifecycle"

/**
 * 应用模块契约。所有参与启动的单元（OS 副作用 / IPC 注册 / 业务初始化）都实现此接口。
 *
 * 启动器按 phase 分组串行执行 setup，应用退出时反向调用 dispose。
 * - 不继承基类、不装饰器 —— 一个对象字面量即可
 * - 同一 phase 内按数组顺序执行
 * - setup 抛错会中断启动（fail-fast）
 */
export interface AppModule {
  /** 模块名，用于日志和诊断 */
  readonly name: string
  /** 在哪个阶段调用 setup */
  readonly phase: Phase
  /** 启动时调用，可同步或异步 */
  setup(ctx: AppContext): void | Promise<void>
  /** 应用退出时调用，释放资源。按 setup 的反序执行。 */
  dispose?(ctx: AppContext): void | Promise<void>
}
