import { dialog, type OpenDialogOptions, type SaveDialogOptions, type MessageBoxOptions } from "electron"
import { Controller, Handle, IpcController } from "../../framework"

/**
 * 原生对话框模块：文件选择、保存、消息确认。
 * renderer 无法直接调用 Electron dialog API，必须通过 IPC 桥接。
 */
@Controller("dialog")
export class DialogService extends IpcController {
  private getWindow(): Electron.BrowserWindow {
    const win = this.ctx.mainWindow.get()
    if (!win) throw new Error("dialog: 主窗口未创建")
    return win
  }

  @Handle("open-file")
  openFile(options: OpenDialogOptions) {
    return dialog.showOpenDialog(this.getWindow(), options)
  }

  @Handle("save-file")
  saveFile(options: SaveDialogOptions) {
    return dialog.showSaveDialog(this.getWindow(), options)
  }

  @Handle("message-box")
  messageBox(options: MessageBoxOptions) {
    return dialog.showMessageBox(this.getWindow(), options)
  }
}
