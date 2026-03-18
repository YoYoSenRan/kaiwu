import { NextResponse, type NextRequest } from "next/server"
import { db, users } from "@kaiwu/db"
import { eq } from "drizzle-orm"
import { exchangeCodeForToken, getGitHubUser, estimateStars, signJwt, setSessionCookie } from "@/lib/auth"

/**
 * GitHub OAuth 回调
 * GET /api/auth/github?code=xxx&state=redirectTo
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get("code")
  const redirectTo = req.nextUrl.searchParams.get("state") ?? "/"

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url))
  }

  try {
    const accessToken = await exchangeCodeForToken(code)
    const ghUser = await getGitHubUser(accessToken)
    const stars = estimateStars(ghUser)

    // upsert user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.githubId, String(ghUser.id)))
      .limit(1)

    let userId: string

    if (existing.length > 0) {
      userId = existing[0]!.id
      await db.update(users).set({ username: ghUser.login, avatarUrl: ghUser.avatar_url, githubStars: stars, updatedAt: new Date() }).where(eq(users.id, userId))
    } else {
      const [inserted] = await db
        .insert(users)
        .values({ githubId: String(ghUser.id), username: ghUser.login, avatarUrl: ghUser.avatar_url, githubStars: stars, githubCreated: new Date(ghUser.created_at) })
        .returning({ id: users.id })

      userId = inserted!.id
    }

    const token = await signJwt({ userId, githubId: String(ghUser.id), username: ghUser.login })

    await setSessionCookie(token)
    return NextResponse.redirect(new URL(redirectTo, req.url))
  } catch (err) {
    console.error("[auth/github]", err)
    return NextResponse.redirect(new URL("/?error=auth_failed", req.url))
  }
}
