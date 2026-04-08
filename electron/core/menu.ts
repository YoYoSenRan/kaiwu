import { isMac } from "./env"
import { Menu, app, type MenuItemConstructorOptions } from "electron"

/**
 * 安装 application menu。
 * macOS 上接管 Electron 的默认菜单，避免默认菜单触发的
 * "representedObject is not a WeakPtrToElectronMenuModelAsNSObject" 噪音日志。
 * 仅在启动时调用一次，禁止后续 setApplicationMenu —— 旧菜单的
 * NSMenuItem 弱引用变野会再次触发该警告。
 */
export function setupAppMenu(): void {
  if (!isMac) {
    // 非 macOS 平台不需要 application menu
    Menu.setApplicationMenu(null)
    return
  }

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
