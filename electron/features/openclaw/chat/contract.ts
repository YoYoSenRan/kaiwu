/**
 * chat 能力契约（主进程侧）。
 *
 * 定义 kaiwu 内部使用的消息类型。ChatEvent 走 gateway 协议原始格式（contract.ts），
 * 本文件定义 kaiwu 侧对 renderer 暴露的简化消息结构。
 */

/** 发送消息的请求参数（renderer → main）。 */
export interface ChatSendRequest {
  sessionKey: string
  message: string
  thinking?: string
}

/** 推给 renderer 的流式消息块。 */
export interface ChatStreamChunk {
  sessionKey: string
  runId: string
  /** delta=增量文本, final=完成, error=出错, aborted=中断 */
  state: "delta" | "final" | "error" | "aborted"
  /** state=delta 时为增量文本 */
  text?: string
  /** state=error 时为错误信息 */
  error?: string
  /** state=final 时包含 token 用量 */
  usage?: {
    input?: number
    output?: number
    total?: number
  }
}
