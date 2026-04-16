import log from "electron-log/main"
import path from "node:path"
import { app } from "electron"
import { LogWriter } from "./writer"

const basePath = app.isPackaged
  ? path.join(app.getPath("userData"), "logs")
  : path.join(app.getAppPath(), "logs")

const writer = new LogWriter(basePath)

if (app.isPackaged) {
  // 生产：写文件，不输出控制台
  log.transports.file.level = "info"
  log.transports.console.level = false
} else {
  // 开发：文件 + 控制台都输出
  log.transports.file.level = "debug"
  log.transports.console.level = "debug"
}

log.transports.console.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{scope}] {text}"

// 拦截所有 transport：只写一次自定义文件，阻止 electron-log 的 file transport 写入。
// electron-log 的 hooks 对每个活跃 transport 都触发，用 WeakSet 去重保证 writer 只写一次。
const written = new WeakSet<object>()
log.hooks.push((message, _transport, transportName) => {
  if (!written.has(message)) {
    written.add(message)
    writer.write(formatMessage(message))
  }
  if (transportName === "file") return false
  return message
})

log.initialize()
log.errorHandler.startCatching()
log.info("════════════════════════ SESSION START ════════════════════════")

/** 创建 scoped logger。 */
export const scope = (name: string) => log.scope(name)

export default log
export type Logger = typeof log

/** 将 electron-log 消息格式化为单行文本。 */
function formatMessage(msg: { date: Date; level: string; scope?: string; data: unknown[] }): string {
  const d = msg.date
  const ts = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`
  const scope = msg.scope ? ` (${msg.scope})` : ""
  const text = msg.data.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(" ")
  return `[${ts}] ${`[${msg.level}]`.padEnd(8)}[${scope.padEnd(26)}] ${text}`
}

function p(n: number): string {
  return String(n).padStart(2, "0")
}
