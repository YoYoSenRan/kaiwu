import { Phase } from "../framework/lifecycle"
import { IpcRegistry, setIpcEmitHost } from "../framework"
import { LogService } from "../platform/logger/service"
import { ThemeService } from "../platform/theme/service"
import { PowerService } from "../platform/power/service"
import { ShellService } from "../platform/shell/service"
import { ChromeService } from "../platform/chrome/service"
import { DialogService } from "../platform/dialog/service"
import { UpdaterService } from "../platform/updater/service"
import { ClipboardService } from "../platform/clipboard/service"
import { NotificationService } from "../platform/notification/service"
import { OpenclawService } from "../features/openclaw/service"
import { KnowledgeService } from "../features/knowledge/service"
import type { AppModule } from "../framework/module"

/**
 * IPC 模块：把所有 Controller 作为一个启动单元统一注册/清理。
 *
 * 注册顺序：ChromeService 依赖主窗口已创建，必须排在 platform 之首。
 * setup 里先 setIpcEmitHost 再 register，保证 onReady 里使用 emit 有效。
 */
export const ipcModule: AppModule = {
  name: "ipc",
  phase: Phase.AfterWindowOpen,
  async setup(ctx) {
    setIpcEmitHost(() => ctx.mainWindow.webContents())

    await IpcRegistry.register(ctx, [
      // platform
      ChromeService,
      UpdaterService,
      LogService,
      DialogService,
      ShellService,
      NotificationService,
      ClipboardService,
      PowerService,
      ThemeService,
      // features
      OpenclawService,
      KnowledgeService,
    ])
  },
  async dispose() {
    await IpcRegistry.shutdown()
  },
}
