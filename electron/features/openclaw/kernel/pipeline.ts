/**
 * RPC 调用中间件管道。
 *
 * 调用方式参考 Koa/Express:每个 middleware 接 `(ctx, next)`,内部可在 next() 前后插入逻辑。
 * terminal 是管道终点(实际的 gateway.call),放在链尾。
 *
 * 典型用途:
 *   - 调用耗时埋点
 *   - 错误标注/包装
 *   - 重试策略
 *   - 鉴权刷新
 *   - 限流
 *
 * 设计约束:
 *   - 同步添加,按注册顺序执行(FIFO)
 *   - next() 只能调一次,重复调用抛错(防 middleware 写错导致 terminal 被执行两次)
 *   - pipeline 不持有调用结果,由 terminal/middleware 返回值透传
 */

export interface CallContext {
  /** gateway 方法名,形如 `chat.send` / `sessions.list`。 */
  readonly method: string
  /** 调用入参(由 caller 原样透传)。 */
  readonly params: unknown
}

export type Middleware = (ctx: CallContext, next: () => Promise<unknown>) => Promise<unknown>

export class Pipeline {
  private readonly chain: Middleware[] = []

  /** 追加 middleware 到链尾。返回自身便于链式调用。 */
  use(middleware: Middleware): this {
    this.chain.push(middleware)
    return this
  }

  /**
   * 按链顺序执行 middleware,到终点时调用 terminal 并把结果透传回去。
   * @param ctx 调用上下文,全链只读
   * @param terminal 终点 handler(通常是 caller.call)
   */
  async run<T>(ctx: CallContext, terminal: () => Promise<T>): Promise<T> {
    const dispatch = (index: number): Promise<unknown> => {
      const middleware = this.chain[index]
      if (!middleware) return terminal()
      let called = false
      return middleware(ctx, () => {
        if (called) throw new Error("middleware next() 重复调用")
        called = true
        return dispatch(index + 1)
      })
    }
    return dispatch(0) as Promise<T>
  }
}
