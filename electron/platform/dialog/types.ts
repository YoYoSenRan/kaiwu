import type { OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue, MessageBoxOptions, MessageBoxReturnValue } from "electron"

export interface DialogBridge {
  /** 打开文件/目录选择对话框 */
  openFile: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>
  /** 保存文件对话框 */
  saveFile: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>
  /** 消息确认框 */
  messageBox: (options: MessageBoxOptions) => Promise<MessageBoxReturnValue>
}
