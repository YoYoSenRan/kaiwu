import { db, keywords, users, votes } from "@kaiwu/db"
import { eq, desc, and } from "drizzle-orm"

export interface KeywordWithMeta {
  id: string
  text: string
  reason: string
  sealVotes: number
  blankVotes: number
  weight: number | null
  status: string
  createdAt: Date
  submitter: { username: string; avatarUrl: string | null } | null
  currentUserStance: "seal" | "blank" | null
}

/** 查询物帖列表（按权重排序 + 筛选 + 当前用户投票状态） */
export async function getKeywords(params: { status?: string; currentUserId?: string }): Promise<KeywordWithMeta[]> {
  const { status, currentUserId } = params

  const rows = await db
    .select({
      id: keywords.id,
      text: keywords.text,
      reason: keywords.reason,
      sealVotes: keywords.sealVotes,
      blankVotes: keywords.blankVotes,
      weight: keywords.weight,
      status: keywords.status,
      createdAt: keywords.createdAt,
      submitterUsername: users.username,
      submitterAvatar: users.avatarUrl,
    })
    .from(keywords)
    .leftJoin(users, eq(keywords.submittedBy, users.id))
    .where(status ? eq(keywords.status, status) : undefined)
    .orderBy(desc(keywords.weight))

  // 批量查询当前用户的投票状态
  let userVotes: Map<string, string> = new Map()
  if (currentUserId) {
    const voteRows = await db.select({ keywordId: votes.keywordId, stance: votes.stance }).from(votes).where(eq(votes.userId, currentUserId))

    userVotes = new Map(voteRows.map((v) => [v.keywordId, v.stance]))
  }

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    reason: row.reason,
    sealVotes: row.sealVotes,
    blankVotes: row.blankVotes,
    weight: row.weight,
    status: row.status,
    createdAt: row.createdAt,
    submitter: row.submitterUsername ? { username: row.submitterUsername, avatarUrl: row.submitterAvatar } : null,
    currentUserStance: (userVotes.get(row.id) as "seal" | "blank") ?? null,
  }))
}
