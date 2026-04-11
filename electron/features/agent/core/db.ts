import path from "node:path"
import { app } from "electron"
import Database from "better-sqlite3"
import log from "../../../core/logger"

let instance: Database.Database | null = null

/**
 * 获取 kaiwu 本地 sqlite 数据库实例（首次调用时惰性打开并初始化 schema）。
 * 不能在 app.whenReady 之前调用，因为依赖 app.getPath("userData")。
 */
export function getDb(): Database.Database {
  if (instance) return instance

  const dbPath = path.join(app.getPath("userData"), "kaiwu.db")
  instance = new Database(dbPath)

  // WAL 提升并发写性能，崩溃恢复比 rollback journal 更可靠
  instance.pragma("journal_mode = WAL")
  instance.pragma("foreign_keys = ON")

  initSchema(instance)
  log.info(`[agent/db] opened ${dbPath}`)
  return instance
}

/**
 * 关闭数据库连接。
 * 应用退出前调用，确保 WAL 文件被正确 checkpoint。
 */
export function closeDb(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}

/**
 * 初始化所有表与索引。
 * 使用 IF NOT EXISTS 保证幂等，每次启动都会跑一遍。
 */
function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id             TEXT PRIMARY KEY,
      agent          TEXT NOT NULL UNIQUE,
      name           TEXT NOT NULL,
      workspace      TEXT NOT NULL,
      model          TEXT,
      emoji          TEXT,
      avatar         TEXT,
      avatar_url     TEXT,
      created_at     INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL,
      last_synced_at INTEGER,
      pinned         INTEGER NOT NULL DEFAULT 0,
      hidden         INTEGER NOT NULL DEFAULT 0,
      sort_order     INTEGER NOT NULL DEFAULT 0,
      tags           TEXT,
      last_opened_at INTEGER,
      remark         TEXT,
      sync_state     TEXT NOT NULL DEFAULT 'ok'
    );
    CREATE INDEX IF NOT EXISTS idx_agents_list
      ON agents(hidden, pinned DESC, sort_order, created_at DESC);
  `)
}
