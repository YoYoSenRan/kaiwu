import fs from "node:fs"
import path from "node:path"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { Phase } from "../framework/lifecycle"
import { appRoot } from "../infra/paths"
import { scope } from "../infra/logger"
import { closeDatabase, database } from "./client"
import type { AppModule } from "../framework/module"

const migrateLog = scope("db:migrate")

// dev/打包后 migrations 目录都随源码走 electron/database/migrations/。
// 生产打包需要在 electron-builder files 里显式包含此目录（后续加业务表时再处理）。
const MIGRATIONS_DIR = path.join(appRoot, "electron/database/migrations")
const JOURNAL_FILE = path.join(MIGRATIONS_DIR, "meta/_journal.json")

/**
 * DB 迁移模块。Phase.Starting —— 必须早于所有 IPC，确保 feature 查询时 schema 已就绪。
 *
 * 首次 `pnpm db:generate` 前 `meta/_journal.json` 不存在，此时跳过 migrator 避免抛错；
 * 当前 schema.ts 无业务表，DB 自然为空，feature 查询会在表缺失时显式失败。
 */
export const migrateModule: AppModule = {
  name: "db:migrate",
  phase: Phase.Starting,
  setup() {
    if (!fs.existsSync(JOURNAL_FILE)) {
      migrateLog.info("no migrations journal yet, skipping migrator")
      return
    }
    migrate(database(), { migrationsFolder: MIGRATIONS_DIR })
    migrateLog.info("migrations applied")
  },
  dispose() {
    closeDatabase()
  },
}
