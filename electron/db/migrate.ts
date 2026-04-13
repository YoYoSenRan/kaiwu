import path from "node:path"
import { app } from "electron"
import Database from "better-sqlite3"
import { scope } from "../core/logger"
import initialSql from "./migrations/0000_initial.sql?raw"
import knowledgeSql from "./migrations/0001_knowledge.sql?raw"
import chatSql from "./migrations/0002_chat.sql?raw"
import invocationsSql from "./migrations/0003_invocations.sql?raw"

const dbLog = scope("db")

/** 迁移清单：每新增一个 drizzle-kit generate 产出的 SQL 文件就追加一项。 */
const MIGRATIONS: { name: string; sql: string }[] = [
  { name: "0000_initial", sql: initialSql },
  { name: "0001_knowledge", sql: knowledgeSql },
  { name: "0002_chat", sql: chatSql },
  { name: "0003_invocations", sql: invocationsSql },
]

interface MigrationRow {
  name: string
}

/**
 * 启动时应用所有未跑过的 migration。
 * 自维护 __kaiwu_migrations 追踪表，用 better-sqlite3 的 transaction 保证原子性。
 * 必须在 getDb() 第一次使用之前调用，否则业务查询会打到未建表的 db。
 *
 * SQL 内容通过 vite 的 ?raw 导入在编译期嵌入 bundle，避免 prod 环境找不到 migrations 目录。
 */
export function runMigrations(): void {
  const dbPath = path.join(app.getPath("userData"), "kaiwu.db")
  const sqlite = new Database(dbPath)
  sqlite.pragma("journal_mode = WAL")

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS __kaiwu_migrations (
        name       TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `)

    const rows = sqlite.prepare(`SELECT name FROM __kaiwu_migrations`).all() as MigrationRow[]
    const applied = new Set(rows.map((r) => r.name))

    for (const m of MIGRATIONS) {
      if (applied.has(m.name)) continue
      applyMigration(sqlite, m)
      dbLog.info(`数据库迁移已应用: ${m.name}`)
    }
  } finally {
    sqlite.close()
  }
}

/** 跑单个 migration：按 drizzle-kit 的 statement-breakpoint 切分多语句，整体走一个事务。 */
function applyMigration(sqlite: Database.Database, migration: { name: string; sql: string }): void {
  const statements = migration.sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const tx = sqlite.transaction(() => {
    for (const stmt of statements) sqlite.exec(stmt)
    sqlite.prepare(`INSERT INTO __kaiwu_migrations (name, applied_at) VALUES (?, ?)`).run(migration.name, Date.now())
  })
  tx()
}
