/** 事件路由键提取函数。注册到 transport/stream.ts 的 EventStream.registerKeyExtractor。 */

/** 从带 sessionKey 的 payload 里提取路由 key。chat 和 agent 事件共用。 */
export function extractSessionKey(payload: unknown): string | undefined {
  const p = payload as { sessionKey?: string }
  return p.sessionKey
}
