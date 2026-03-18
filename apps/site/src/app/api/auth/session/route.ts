import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

/** GET /api/auth/session — 返回当前用户信息 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser()
  return NextResponse.json({ user })
}
