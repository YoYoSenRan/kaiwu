import path from "node:path"
import { app } from "electron"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { scope } from "../infra/logger"
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"

const dbLog = scope("db")

let drizzleInstance: BetterSQLite3Database | null = null
let sqliteInstance: Database.Database | null = null

/**
 * 获取 drizzle 实例。首次调用时惰性打开 SQLite 连接。
 *
 * DB 文件：`<userData>/kaiwu.db`，和 LanceDB 的 `<userData>/vector/` 同级。
 * 开启 WAL 提升桌面端读写并发，开启外键约束。
 */
export function getDb(): BetterSQLite3Database {
  if (drizzleInstance) return drizzleInstance

  const dbPath = path.join(app.getPath("userData"), "kaiwu.db")
  sqliteInstance = new Database(dbPath)
  sqliteInstance.pragma("journal_mode = WAL")
  sqliteInstance.pragma("foreign_keys = ON")
  drizzleInstance = drizzle(sqliteInstance)
  dbLog.info(`SQLite opened at ${dbPath}`)
  return drizzleInstance
}

/** 关闭 SQLite 连接。只在应用关停时调用。 */
export function closeDb(): void {
  sqliteInstance?.close()
  sqliteInstance = null
  drizzleInstance = null
}
