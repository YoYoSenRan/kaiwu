import { NextResponse } from "next/server"
import { db, agents } from "@kaiwu/db"

/** GET /api/pipeline/agents — 返回所有 Agent 列表 */
export async function GET(): Promise<NextResponse> {
  const rows = await db.select().from(agents)
  return NextResponse.json(rows)
}
