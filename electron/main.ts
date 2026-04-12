import "./core/logger"
import { app } from "electron"
import { closeDb } from "./db/client"
import { closeVectorDb } from "./core/vector"
import { runMigrations } from "./db/migrate"
import { setupAppMenu } from "./core/menu"
import { setupLog } from "./features/log/ipc"
import { setupAgent } from "./features/agent/ipc"
import { setupKnowledge } from "./features/knowledge/ipc"
import { setupEmbedding } from "./features/embedding/ipc"
import { createMainWindow } from "./core/window"
import { setupChrome } from "./features/chrome/ipc"
import { setupUpdater } from "./features/updater/ipc"
import { setupOpenclaw } from "./features/openclaw/ipc"
import { stopPlugin } from "./features/openclaw/core/lifecycle"
import { setupDeeplinkListeners } from "./features/deeplink/ipc"
import { terminateWorker } from "./embedding/local"
import { prepareApp, requestSingleInstance, setupAppLifecycle } from "./core/app"
import { setupCSP } from "./core/security"
import { flushPendingDeepLink, setupProtocol } from "./features/deeplink/service"

// ===== 启动前同步准备 =====

prepareApp()

// 自定义协议注册必须在 requestSingleInstanceLock 之前
// 因为 Windows 下第二个实例会携带协议 URL 作为命令行参数
setupProtocol()

// deeplink 监听必须在 whenReady 之前注册
// macOS 冷启动的 open-url 可能在 ready 之前触发
setupDeeplinkListeners()

if (!requestSingleInstance()) {
  app.quit()
  process.exit(0)
}

// ===== 应用级生命周期 =====

setupAppLifecycle()

// ===== 应用就绪后创建窗口 =====

app.whenReady().then(() => {
  // CSP 必须在创建窗口前注入
  setupCSP()

  // 接管 application menu，避免 Electron 默认菜单触发的 NSMenu noise log
  setupAppMenu()

  // db migration 必须在 setupAgent() 注册 IPC 之前跑完，否则首次查询会打到未建表的 db
  runMigrations()

  // 先创建主窗口，因为 setupChrome 需要绑定窗口的 maximize 事件
  createMainWindow()

  // IPC handler 一次性注册，避免每次创建窗口都重复注册
  // 全部在 loadURL 完成前同步执行，渲染进程首次调用时 handler 一定已就绪
  setupChrome()
  setupUpdater()
  setupLog()
  setupOpenclaw()
  setupAgent()
  setupKnowledge()
  setupEmbedding()

  // 处理 macOS 冷启动时暂存的深度链接
  flushPendingDeepLink()
})

function gracefulShutdown(): void {
  void terminateWorker()
  void closeVectorDb()
  void stopPlugin()
  closeDb()
}

// 正常退出路径
app.on("before-quit", gracefulShutdown)

// 开发环境 Ctrl+C / SIGTERM（不会触发 before-quit）
process.on("SIGINT", () => {
  gracefulShutdown()
  process.exit(0)
})
process.on("SIGTERM", () => {
  gracefulShutdown()
  process.exit(0)
})
