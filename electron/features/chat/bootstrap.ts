/**
 * openclaw session 初始化参数构造（扩展点 4）。
 *
 * MVP：不设置 groupActivation。未来走 α 路径时，把 reply_mode 映射到 groupActivation。
 *
 * key 格式两套（按 mode 区分）：
 *   direct: `agent:<agentId>:kaiwu:direct:<sessionId>`           —— 单聊只有 1 个 agent，sessionId 已唯一
 *   group:  `agent:<agentId>:kaiwu:group:<sessionId>:<memberId>` —— 群聊需要 memberId 区分同一 session 下不同成员
 */

import type { ChatMode, ReplyMode } from "./types"

export interface OpenClawSessionInitParams {
  /** openclaw session key，kaiwu 自己分配。 */
  key: string
  /** openclaw agent id（从 agents.list 选）。 */
  agentId: string
  // 扩展点：未来可加 groupActivation
  // 注意：故意不传 label —— openclaw 约束 label 在 agent 内唯一，kaiwu 用户的 label 归 kaiwu 本地管，
  //       否则两个 kaiwu session 同名时 openclaw 会拒 "label already in use"。
}

/** 构造 openclaw.sessions.create 参数。 */
export function buildSessionInitParams(input: { sessionId: string; memberId: string; agentId: string; mode: ChatMode; replyMode: ReplyMode }): OpenClawSessionInitParams {
  return {
    key: makeOpenClawKey(input.agentId, input.mode, input.sessionId, input.memberId),
    agentId: input.agentId,
  }
}

/**
 * kaiwu 自造的 openclaw session key 格式。
 *
 * 设计借鉴 openclaw 官方 discord 插件的 `agent:<agentId>:discord:<kind>:<externalId>` 风格：
 *   - 前置 `agent:<agentId>` 让 key 自带命名空间（openclaw 侧一眼能查到某 agent 的所有 session）
 *   - `kaiwu` 标识来源系统，与 discord / slack 等其他插件 session 区分
 *   - `<mode>` (direct / group) 无需查 DB 即可分类
 *   - direct 下 `<sessionId>` 做锚；group 追加 `<memberId>` 区分同 session 下不同成员
 */
export function makeOpenClawKey(agentId: string, mode: ChatMode, sessionId: string, memberId: string): string {
  if (mode === "direct") return `agent:${agentId}:kaiwu:direct:${sessionId}`
  return `agent:${agentId}:kaiwu:group:${sessionId}:${memberId}`
}

/** 解析 key 返回各字段；格式不符返回 null。 */
export interface ParsedOpenClawKey {
  agentId: string
  mode: ChatMode
  sessionId: string
  /** direct 下为 undefined，group 下必有。 */
  memberId?: string
}
export function parseOpenClawKey(key: string): ParsedOpenClawKey | null {
  const parts = key.split(":")
  // agent:<agentId>:kaiwu:<mode>:<sessionId>[:<memberId>]
  if (parts.length < 5) return null
  if (parts[0] !== "agent" || parts[2] !== "kaiwu") return null
  const mode = parts[3]
  if (mode === "direct") {
    if (parts.length !== 5) return null
    return { agentId: parts[1], mode, sessionId: parts[4] }
  }
  if (mode === "group") {
    if (parts.length !== 6) return null
    return { agentId: parts[1], mode, sessionId: parts[4], memberId: parts[5] }
  }
  return null
}
