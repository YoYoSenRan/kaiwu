import path from "node:path"
import { app } from "electron"
import { connect } from "@lancedb/lancedb"
import type { Connection } from "@lancedb/lancedb"
import log from "./logger"

let instance: Connection | null = null

/**
 * 获取 LanceDB 连接实例（首次调用时惰性打开）。
 * 数据目录：userData/vector/，和 SQLite 的 userData/kaiwu.db 同级。
 */
export async function getVectorDb(): Promise<Connection> {
  if (instance) return instance

  const dbPath = path.join(app.getPath("userData"), "vector")
  instance = await connect(dbPath)
  log.info(`[vector] opened ${dbPath}`)
  return instance
}

/**
 * 关闭 LanceDB 连接。
 * 应用退出前调用，释放文件句柄。
 */
export async function closeVectorDb(): Promise<void> {
  if (instance) {
    instance = null
    log.info("[vector] closed")
  }
}
