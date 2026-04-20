/**
 * Agent 回复后处理（扩展点 3）。
 *
 * MVP：透传，不做 silent token 识别。
 * 未来 β 升级：识别 <SILENT> 或其他约定 marker，返回 shouldSuppress=true。
 */

export interface InterpretResult {
  content: string
  shouldSuppress: boolean
}

export function interpretReply(raw: string): InterpretResult {
  return { content: raw, shouldSuppress: false }
}
