import { NextResponse } from "next/server"
import { db, projects } from "@kaiwu/db"
import { and, notInArray } from "drizzle-orm"

/** GET /api/pipeline/projects — 返回当前 running 造物令 */
export async function GET(): Promise<NextResponse> {
  const rows = await db
    .select()
    .from(projects)
    .where(and(notInArray(projects.status, ["launched", "dead"])))

  return NextResponse.json(rows)
}
