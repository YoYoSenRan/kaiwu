import path from "node:path"
import { app } from "electron"
import { connect } from "@lancedb/lancedb"
import type { Connection } from "@lancedb/lancedb"
import { scope } from "./logger"

const vectorLog = scope("vector")

let instance: Connection | null = null

/**
 * 获取 LanceDB 连接实例（首次调用时惰性打开）。
 * 数据目录：userData/vector/，和 SQLite 的 userData/kaiwu.db 同级。
 */
export async function getVectorDb(): Promise<Connection> {
  if (instance) return instance

  const dbPath = path.join(app.getPath("userData"), "vector")
  instance = await connect(dbPath)
  vectorLog.info(`向量数据库已打开: ${dbPath}`)
  return instance
}

/**
 * 关闭 LanceDB 连接。
 * 应用退出前调用，释放文件句柄。
 */
export async function closeVectorDb(): Promise<void> {
  if (instance) {
    instance.close()
    instance = null
    vectorLog.info("向量数据库已关闭")
  }
}
