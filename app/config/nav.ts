import type { ComponentType } from "react"

import { Bot, LayoutDashboard, Library, ListChecks, MessageSquare, Plug, Settings, Workflow } from "lucide-react"

export interface NavItem {
  path: string
  /** 页面标识，派生 i18n key：`nav.<key>`（菜单）与 `<key>.label`（页面头部） */
  key: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

/**
 * 侧边栏菜单的单一数据源。
 * 新增/删除菜单项只改这里，Sidebar 与 Header 自动响应。
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", key: "dashboard", icon: LayoutDashboard },
  { path: "/task", key: "task", icon: ListChecks },
  { path: "/knowledge", key: "knowledge", icon: Library },
  { path: "/agent", key: "agent", icon: Bot },
  { path: "/chat", key: "chat", icon: MessageSquare },
  { path: "/workflow", key: "workflow", icon: Workflow },
  { path: "/connect", key: "connect", icon: Plug },
  { path: "/settings", key: "settings", icon: Settings },
]
