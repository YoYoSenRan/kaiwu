import type { ComponentType } from "react"
import { Bot, LayoutDashboard, Library, ListChecks, MessagesSquare, Plug, Settings } from "lucide-react"

export interface NavItem {
  path: string
  /** i18n key，渲染时通过 t() 取菜单文本 */
  labelKey: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

/**
 * 侧边栏菜单的单一数据源。
 * 新增/删除菜单项只改这里，Sidebar 组件自动响应。
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { path: "/agent", labelKey: "nav.agent", icon: Bot },
  { path: "/task", labelKey: "nav.task", icon: ListChecks },
  { path: "/chat", labelKey: "nav.chat", icon: MessagesSquare },
  { path: "/knowledge", labelKey: "nav.knowledge", icon: Library },
  { path: "/connect", labelKey: "nav.connect", icon: Plug },
  { path: "/settings", labelKey: "nav.settings", icon: Settings },
]
