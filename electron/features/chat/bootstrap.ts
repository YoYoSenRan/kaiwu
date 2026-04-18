/**
 * openclaw session 初始化参数构造（扩展点 4）。
 *
 * MVP：不设置 groupActivation。未来走 α 路径时，把 reply_mode 映射到 groupActivation。
 */

import type { ReplyMode } from "./types"

export interface OpenClawSessionInitParams {
  /** openclaw session key，kaiwu 自己分配（格式：`kaiwu:chat:<sessionId>:<agentId>`）。 */
  key: string
  /** openclaw agent id（从 agents.list 选）。 */
  agentId: string
  /** 可选 label，用于 openclaw 侧展示。 */
  label?: string
  // 扩展点：未来可加 groupActivation
}

/** 构造 openclaw.sessions.create 参数。 */
export function buildSessionInitParams(input: { sessionId: string; memberId: string; agentId: string; label?: string; replyMode: ReplyMode }): OpenClawSessionInitParams {
  return {
    key: makeOpenClawKey(input.sessionId, input.memberId),
    agentId: input.agentId,
    label: input.label,
  }
  // 未来：if (upgradeAlpha) { groupActivation: input.replyMode === "auto" ? "always" : "mention" }
}

/** kaiwu 自造的 openclaw session key 格式。 */
export function makeOpenClawKey(sessionId: string, memberId: string): string {
  return `kaiwu:chat:${sessionId}:${memberId}`
}
