import log from "electron-log/main"
import path from "node:path"
import { app } from "electron"

if (app.isPackaged) {
  // 生产：写用户数据目录，不输出控制台，5MB 单文件上限
  log.transports.file.maxSize = 5 * 1024 * 1024
  log.transports.file.level = "info"
  log.transports.console.level = false
} else {
  // 开发：写 logs/dev.log（项目根目录下，已在 .gitignore 排除）
  // 512KB 上限：大约够 4-5 次调试会话，AI 读取不会超限
  log.transports.file.maxSize = 512 * 1024
  log.transports.file.level = "debug"
  log.transports.file.resolvePathFn = () => path.join(app.getAppPath(), "logs", "dev.log")
  log.transports.console.level = "debug"
}

log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{scope}] {text}"

// 必须在 app.whenReady() 之前调用
log.initialize()

// 捕获未处理的异常和 Promise rejection，写入日志文件
log.errorHandler.startCatching()

// 写入 session 分隔线，方便在 dev.log 中区分不同启动周期
log.info("════════════════════════ SESSION START ════════════════════════")

export const scope = (name: string) => log.scope(name)

export default log
export type Logger = typeof log
