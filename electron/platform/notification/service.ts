import { Notification } from "electron"
import { Controller, Handle, IpcController } from "../../framework"
import type { NotifyOptions } from "./types"

/**
 * 系统通知模块：renderer 请求显示 OS 原生通知。
 * 适用于后台任务完成、Agent 状态变化等需要打断用户的场景。
 */
@Controller("notification")
export class NotificationService extends IpcController {
  @Handle("show")
  show(options: NotifyOptions) {
    new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
    }).show()
  }
}
