import { app } from "electron"
import { scope } from "./core/logger"
import { closeDb } from "./db/client"
import { closeVectorDb } from "./core/vector"
import { runMigrations } from "./db/migrate"
import { setupAppMenu } from "./core/menu"
import { setupLog } from "./features/log/ipc"
import { setupAgent } from "./features/agent/ipc"
import { setupKnowledge } from "./features/knowledge/ipc"
import { setupChat } from "./features/chat/ipc"
import { setupEmbedding } from "./features/embedding/ipc"
import { createMainWindow } from "./core/window"
import { setupChrome } from "./features/chrome/ipc"
import { setupUpdater } from "./features/updater/ipc"
import { setupOpenclaw } from "./openclaw/ipc"
import { stopPlugin } from "./openclaw/core/lifecycle"
import { setupDeeplinkListeners } from "./features/deeplink/ipc"
import { terminateWorker } from "./embedding/local"
import { prepareApp, requestSingleInstance, setupAppLifecycle } from "./core/app"
import { setupCSP } from "./core/security"
import { flushPendingDeepLink, setupProtocol } from "./features/deeplink/service"

const startup = scope("startup")

// ===== 启动前同步准备 =====

startup.info("启动前准备开始")
prepareApp()
startup.info("应用准备完成")

// 自定义协议注册必须在 requestSingleInstanceLock 之前
// 因为 Windows 下第二个实例会携带协议 URL 作为命令行参数
setupProtocol()
startup.info("应用协议已注册")

// deeplink 监听必须在 whenReady 之前注册
// macOS 冷启动的 open-url 可能在 ready 之前触发
setupDeeplinkListeners()
startup.info("深度链接监听器已注册")

if (!requestSingleInstance()) {
  startup.warn("单实例检查失败，退出应用")
  app.quit()
  process.exit(0)
}
startup.info("单实例检查通过")

// ===== 应用级生命周期 =====

setupAppLifecycle()
startup.info("应用生命周期已设置")

// ===== 应用就绪后创建窗口 =====

app.whenReady().then(() => {
  startup.info("应用就绪，开始初始化")

  // CSP 必须在创建窗口前注入
  setupCSP()
  startup.info("CSP 策略已注入")

  // 接管 application menu，避免 Electron 默认菜单触发的 NSMenu noise log
  setupAppMenu()
  startup.info("应用菜单已接管")

  // db migration 必须在 setupAgent() 注册 IPC 之前跑完，否则首次查询会打到未建表的 db
  runMigrations()

  // 先创建主窗口，因为 setupChrome 需要绑定窗口的 maximize 事件
  createMainWindow()
  startup.info("主窗口已创建")

  // IPC handler 一次性注册，避免每次创建窗口都重复注册
  // 全部在 loadURL 完成前同步执行，渲染进程首次调用时 handler 一定已就绪
  setupChrome()
  startup.info("窗口 IPC 已注册")

  setupUpdater()
  startup.info("自动更新 IPC 已注册")

  setupLog()
  startup.info("日志 IPC 已注册")

  setupOpenclaw()
  startup.info("OpenClaw IPC 已注册")

  setupAgent()
  startup.info("Agent IPC 已注册")

  setupKnowledge()
  startup.info("知识库 IPC 已注册")

  setupEmbedding()
  startup.info("Embedding IPC 已注册")

  setupChat()
  startup.info("Chat IPC 已注册")

  // 处理 macOS 冷启动时暂存的深度链接
  flushPendingDeepLink()
  startup.info("应用初始化完毕")
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
