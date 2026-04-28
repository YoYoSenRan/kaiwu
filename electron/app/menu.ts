import { app, Menu } from "electron"
import type { MenuItemConstructorOptions } from "electron"
import { isMac } from "../infra/env"
import { Phase } from "../framework/lifecycle"
import type { AppModule } from "../framework/module"

/**
 * Application menu：
 * - 非 macOS 平台显式设 null，不用默认菜单
 * - macOS 自建菜单，避免默认菜单的 NSMenuItem 弱引用变野警告
 *
 * 仅启动时调用一次，禁止后续 setApplicationMenu —— 旧菜单的
 * NSMenuItem 弱引用变野会再次触发该警告。
 */
export const menuModule: AppModule = {
  name: "menu",
  phase: Phase.Ready,
  setup() {
    if (!isMac) {
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
  },
}
