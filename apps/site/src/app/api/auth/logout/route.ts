import { NextResponse, type NextRequest } from "next/server"
import { clearSessionCookie } from "@/lib/auth"

/** POST /api/auth/logout — 清除 session，重定向到首页 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  await clearSessionCookie()
  return NextResponse.redirect(new URL("/", req.url))
}
