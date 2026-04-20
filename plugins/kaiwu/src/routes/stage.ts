/**
 * 阶段上下文的内存存储。
 *
 * 生命周期跟随宿主 gateway 进程。控制端在每次阶段切换时通过
 * `context.set` action 重新推送,gateway 重启后控制端也会重建连接并重推,
 * 因此不需要持久化。
 *
 * 归属 `routes/`:由 `context.set` action(写入者)创造和管理,
 * `hooks/prompt` 跨目录 import 读取。
 */

/** 群聊共享历史的单条记录(结构化)。 */
export interface SharedHistoryEntry {
  sender: string
  body: string
  timestamp_ms: number
}

/** 单个阶段要注入的上下文。 */
export interface StageContext {
  /** 阶段指令 → appendSystemContext(系统提示尾部,provider 可缓存)。 */
  instruction: string
  /** 知识库片段 → prependContext(用户消息前面,每轮发送)。 */
  knowledge: string[]
  /**
   * 共享对话历史(群聊其他成员发言) → prependContext 的 "untrusted JSON block"。
   * 结构化 JSON + 明确 untrusted 标签,LLM 看到
   * 不会把历史当作"要分析的素材"。
   */
  sharedHistory?: SharedHistoryEntry[]
}

const store = new Map<string, StageContext>()

export function setStageContext(sessionKey: string, ctx: StageContext): void {
  store.set(sessionKey, ctx)
}

export function getStageContext(sessionKey: string): StageContext | undefined {
  return store.get(sessionKey)
}

export function hasStageContext(sessionKey: string): boolean {
  return store.has(sessionKey)
}

export function clearStageContext(sessionKey: string): void {
  store.delete(sessionKey)
}
