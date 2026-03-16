import { NextResponse } from "next/server"
import { ok, fail } from "@/lib/response"
import { ErrorCode } from "@/types/api"
import { syncAgentsToDb } from "@/app/(dashboard)/agents/server/sync"

interface SyncData {
  synced: number
  unsynced: number
}

/**
 * POST /api/agents/sync
 * 从 openclaw.json 同步 Agent 列表到 DB
 */
export async function POST(): Promise<NextResponse> {
  try {
    const result = await syncAgentsToDb()
    return ok<SyncData>(result, result.synced === 0 ? "openclaw.json 中没有 Agent 配置" : undefined)
  } catch (err) {
    const message = err instanceof Error ? err.message : "同步失败"
    return fail(ErrorCode.SYNC_ERROR, message, 500)
  }
}
