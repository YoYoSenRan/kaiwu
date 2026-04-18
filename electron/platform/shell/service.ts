import { shell } from "electron"
import { Controller, Handle, IpcController } from "../../framework"

/**
 * 系统操作模块：打开外部链接、在文件管理器中显示、用默认应用打开文件。
 */
@Controller("shell")
export class ShellService extends IpcController {
  /** 用默认浏览器打开 URL。 */
  @Handle("open-external")
  openExternal(url: string) {
    return shell.openExternal(url)
  }

  /** 在 Finder / 资源管理器中高亮显示指定文件。 */
  @Handle("show-in-folder")
  showInFolder(path: string) {
    shell.showItemInFolder(path)
  }

  /** 用系统默认应用打开文件。 */
  @Handle("open-path")
  openPath(path: string) {
    return shell.openPath(path)
  }
}
