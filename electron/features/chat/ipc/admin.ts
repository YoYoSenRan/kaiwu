/**
 * @Handle("debug:*") 处理器 — 调试/重置/危险操作集中地。
 */

import { scope } from "../../../infra/logger"
import { clearAllChatTables } from "../repository"

const log = scope("chat:ipc:admin")

export async function clearAll(): Promise<{ cleared: Record<string, number> }> {
  const result = clearAllChatTables()
  log.warn(`debug:clearAll invoked; cleared=${JSON.stringify(result.cleared)}`)
  return result
}
