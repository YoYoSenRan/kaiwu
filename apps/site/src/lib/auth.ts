import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? ""
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? ""
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "kaiwu-dev-secret")
const COOKIE_NAME = "kaiwu_session"

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  public_repos: number
  followers: number
  created_at: string
}

interface SessionPayload {
  userId: string
  githubId: string
  username: string
}

/** 生成 GitHub OAuth 授权 URL */
export function getGitHubAuthUrl(redirectTo?: string): string {
  const params = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope: "read:user", ...(redirectTo && { state: redirectTo }) })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

/** 用 authorization code 换取 access token */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
  })

  const data = (await res.json()) as { access_token?: string; error?: string }
  if (!data.access_token) {
    throw new Error(data.error ?? "Failed to exchange code for token")
  }
  return data.access_token
}

/** 用 access token 获取 GitHub 用户信息 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error("Failed to fetch GitHub user")
  return (await res.json()) as GitHubUser
}

/** 估算 GitHub stars（public_repos × 粗略系数，精确值需遍历 repos） */
export function estimateStars(user: GitHubUser): number {
  // MVP: 用 followers 作为影响力近似，后续可改为真实 stars
  return user.followers
}

/** 签发 JWT */
export async function signJwt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(JWT_SECRET)
}

/** 验证 JWT，返回 payload 或 null */
export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/** 设置 session cookie */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

/** 清除 session cookie */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/** 获取当前登录用户（从 cookie 中读取 JWT） */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyJwt(token)
}
