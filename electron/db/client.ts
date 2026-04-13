import path from "node:path"
import { app } from "electron"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { scope } from "../core/logger"
import * as schema from "./schema"

const dbLog = scope("db")

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

let sqlite: Database.Database | null = null
let instance: DrizzleDb | null = null

/**
 * 获取 drizzle 包装的 sqlite 实例（首次调用时惰性打开）。
 * 不能在 app.whenReady 之前调用，因为依赖 app.getPath("userData")。
 */
export function getDb(): DrizzleDb {
  if (instance) return instance

  const dbPath = path.join(app.getPath("userData"), "kaiwu.db")
  sqlite = new Database(dbPath)

  // WAL 提升并发写性能，崩溃恢复比 rollback journal 更可靠
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")

  instance = drizzle(sqlite, { schema })
  dbLog.info(`数据库已打开: ${dbPath}`)
  return instance
}

/**
 * 关闭数据库连接。
 * 应用退出前调用，确保 WAL 文件被正确 checkpoint。
 */
export function closeDb(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    instance = null
  }
}
