"use server"

import { z } from "zod"
import { db, users, keywords, votes } from "@kaiwu/db"
import { eq, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { calculateWeight, daysSince } from "@/lib/weight"

// ── Schemas ──────────────────────────────────────────────────────────

const submitSchema = z.object({ text: z.string().min(1, "物帖不能为空").max(20, "物帖不超过 20 字"), reason: z.string().min(20, "理由至少 20 字").max(200, "理由不超过 200 字") })

const voteSchema = z.object({ keywordId: z.string().uuid(), stance: z.enum(["seal", "blank"]) })

// ── submitKeyword ────────────────────────────────────────────────────

interface ActionResult {
  error?: string
  success?: boolean
}

export async function submitKeyword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser()
  if (!session) return { error: "请先登录" }

  const parsed = submitSchema.safeParse({ text: formData.get("text"), reason: formData.get("reason") })
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "校验失败"
    return { error: firstError }
  }

  const { text, reason } = parsed.data

  // 查用户信息
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  if (!user) return { error: "用户不存在" }

  // 账号年龄校验
  if (user.githubCreated) {
    const ageDays = daysSince(user.githubCreated)
    if (ageDays < 30) return { error: "GitHub 账号创建不足 30 天，暂时无法提交" }
  }

  // 每日限制
  if (user.lastSubmitAt) {
    const today = new Date().toISOString().slice(0, 10)
    if (user.lastSubmitAt === today) return { error: "今天已经提交过了，明天再来" }
  }

  // 重复检测
  const [duplicate] = await db.select({ id: keywords.id, status: keywords.status }).from(keywords).where(eq(keywords.text, text)).limit(1)

  if (duplicate) {
    if (duplicate.status === "pending") {
      return { error: "这个物帖已有人提交，你可以直接投票支持它" }
    }
    return { error: "这个物帖已经有故事了" }
  }

  // 写入
  await db
    .insert(keywords)
    .values({
      text,
      reason,
      submittedBy: session.userId,
      weight: calculateWeight({ sealVotes: 0, blankVotes: 0, daysSinceSubmit: 0, submitterGithubStars: user.githubStars ?? 0 }),
    })

  // 更新 last_submit_at
  await db
    .update(users)
    .set({ lastSubmitAt: new Date().toISOString().slice(0, 10) })
    .where(eq(users.id, session.userId))

  revalidatePath("/trends")
  return { success: true }
}

// ── castVote (upsert 语义) ───────────────────────────────────────────

export async function castVote(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser()
  if (!session) return { error: "请先登录" }

  const parsed = voteSchema.safeParse({ keywordId: formData.get("keywordId"), stance: formData.get("stance") })
  if (!parsed.success) return { error: "参数错误" }

  const { keywordId, stance } = parsed.data

  // 检查物帖是否存在
  const [keyword] = await db.select().from(keywords).where(eq(keywords.id, keywordId)).limit(1)
  if (!keyword) return { error: "物帖不存在" }

  // 查已有投票
  const [existing] = await db
    .select()
    .from(votes)
    .where(and(eq(votes.userId, session.userId), eq(votes.keywordId, keywordId)))
    .limit(1)

  if (existing) {
    if (existing.stance === stance) {
      return { error: stance === "seal" ? "你已经盖过印了" : "你已经留过白了" }
    }

    // 改票
    await db.update(votes).set({ stance, updatedAt: new Date() }).where(eq(votes.id, existing.id))

    // 更新计数：旧 -1，新 +1
    const sealDelta = stance === "seal" ? 1 : -1
    await db
      .update(keywords)
      .set({ sealVotes: sql`${keywords.sealVotes} + ${sealDelta}`, blankVotes: sql`${keywords.blankVotes} - ${sealDelta}` })
      .where(eq(keywords.id, keywordId))
  } else {
    // 新投票
    await db.insert(votes).values({ userId: session.userId, keywordId, stance })

    if (stance === "seal") {
      await db
        .update(keywords)
        .set({ sealVotes: sql`${keywords.sealVotes} + 1` })
        .where(eq(keywords.id, keywordId))
    } else {
      await db
        .update(keywords)
        .set({ blankVotes: sql`${keywords.blankVotes} + 1` })
        .where(eq(keywords.id, keywordId))
    }
  }

  // 重算权重
  const [updated] = await db
    .select({ sealVotes: keywords.sealVotes, blankVotes: keywords.blankVotes, createdAt: keywords.createdAt, submittedBy: keywords.submittedBy })
    .from(keywords)
    .where(eq(keywords.id, keywordId))
    .limit(1)

  if (updated) {
    let submitterStars = 0
    if (updated.submittedBy) {
      const [submitter] = await db.select({ githubStars: users.githubStars }).from(users).where(eq(users.id, updated.submittedBy)).limit(1)
      submitterStars = submitter?.githubStars ?? 0
    }

    const newWeight = calculateWeight({
      sealVotes: updated.sealVotes,
      blankVotes: updated.blankVotes,
      daysSinceSubmit: daysSince(updated.createdAt),
      submitterGithubStars: submitterStars,
    })

    await db.update(keywords).set({ weight: newWeight }).where(eq(keywords.id, keywordId))
  }

  revalidatePath("/trends")
  return { success: true }
}
