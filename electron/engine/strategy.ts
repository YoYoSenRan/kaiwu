import type { TurnDecision, TurnStrategy } from "./types"

interface Member {
  agentId: string
  sessionKey: string
}

/**
 * 根据策略决定下一个发言者。
 * @param strategy 轮转策略
 * @param members 参与者列表（按 sort_order 排列）
 * @param lastSpeakerIndex 上一个发言者的索引，-1 表示还没人发言
 */
export function nextSpeaker(strategy: TurnStrategy, members: Member[], lastSpeakerIndex: number): TurnDecision {
  if (members.length === 0) throw new Error("no members")

  switch (strategy) {
    case "sequential":
      return pickSequential(members, lastSpeakerIndex)
    case "random":
      return pickRandom(members)
    case "adaptive":
      // P1 先用 sequential 兜底，后续可接入 LLM 判断下一个最适合发言的人
      return pickSequential(members, lastSpeakerIndex)
  }
}

/**
 * 判断当前轮次是否已完成（所有人都发言了一轮）。
 * @param memberCount 参与者总数
 * @param speakerIndex 当前发言者在本轮中的序号（0-based）
 */
export function isRoundComplete(memberCount: number, speakerIndex: number): boolean {
  return speakerIndex >= memberCount - 1
}

function pickSequential(members: Member[], lastIndex: number): TurnDecision {
  const next = (lastIndex + 1) % members.length
  return { agentId: members[next].agentId, sessionKey: members[next].sessionKey }
}

function pickRandom(members: Member[]): TurnDecision {
  const idx = Math.floor(Math.random() * members.length)
  return { agentId: members[idx].agentId, sessionKey: members[idx].sessionKey }
}
