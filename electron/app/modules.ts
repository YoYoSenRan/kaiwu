import { cspModule } from "../infra/security"
import { menuModule } from "./menu"
import { trayModule } from "../shell/tray"
import { ipcModule } from "./ipc"
import { mainWindowModule } from "./window"
import { shortcutsModule } from "../shell/shortcuts"
import { deeplinkFlushModule, deeplinkSetupModule } from "../platform/deeplink/service"
import { appLifecycleModule, platformPrepModule, singleInstanceModule } from "./app"
import type { AppModule } from "../framework/module"

/**
 * 启动时参与注册的所有模块。bootstrap 按 phase 分组串行执行。
 *
 * 同一 phase 内按数组顺序调度。跨 phase 由 bootstrap 推进 Lifecycle 阶段。
 * 模块实现见各自文件的 `xxxModule` 导出。
 */
export const modules: AppModule[] = [
  // ===== Phase.Starting —— whenReady 之前 =====
  platformPrepModule, // Win7 GPU + AppUserModelId
  singleInstanceModule, // 单实例锁
  deeplinkSetupModule, // 注册 URL 协议 + 绑 open-url/second-instance
  appLifecycleModule, // activate / window-all-closed

  // ===== Phase.Ready —— whenReady 之后 =====
  cspModule, // Content-Security-Policy
  menuModule, // macOS application menu
  mainWindowModule, // 创建主窗口 + 加载首页
  trayModule, // 托盘图标 + 菜单
  shortcutsModule, // 全局快捷键

  // ===== Phase.AfterWindowOpen —— 主窗口已创建 =====
  ipcModule, // 注册 11 个 IPC Controller + 注入 emit host
  deeplinkFlushModule, // 处理冷启动暂存的 deeplink URL
]
