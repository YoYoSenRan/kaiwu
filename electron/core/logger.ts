import { app } from "electron"
import log from "electron-log/main"

// 单文件最大 5MB，超过后自动轮转
log.transports.file.maxSize = 5 * 1024 * 1024

log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}"

// 生产写文件，开发写控制台，避免开发时污染用户数据目录
if (app.isPackaged) {
  log.transports.file.level = "info"
  log.transports.console.level = false
} else {
  log.transports.file.level = false
  log.transports.console.level = "debug"
}

// 必须在 app.whenReady() 之前调用
log.initialize()

// 捕获未处理的异常和 Promise rejection，写入日志文件
log.errorHandler.startCatching()

export default log
export type Logger = typeof log
