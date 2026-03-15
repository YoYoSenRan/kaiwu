import { Bot, Coins, Kanban, Layers, LayoutDashboard, Lightbulb, ScrollText, Send, Settings, type LucideIcon } from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  group: string
  items: NavItem[]
}

export const NAV_ITEMS: NavGroup[] = [
  { group: "概览", items: [{ label: "首页", href: "/", icon: LayoutDashboard }] },
  {
    group: "生产",
    items: [
      { label: "看板", href: "/productions", icon: Kanban },
      { label: "选题池", href: "/proposals", icon: Lightbulb },
      { label: "发布管理", href: "/publications", icon: Send },
    ],
  },
  {
    group: "系统",
    items: [
      { label: "Agent 管理", href: "/agents", icon: Bot },
      { label: "模板管理", href: "/templates", icon: Layers },
    ],
  },
  {
    group: "监控",
    items: [
      { label: "成本追踪", href: "/costs", icon: Coins },
      { label: "事件日志", href: "/events", icon: ScrollText },
    ],
  },
  { group: "设置", items: [{ label: "系统设置", href: "/settings", icon: Settings }] },
]

/**
 * 根据 pathname 生成面包屑路径映射
 */
export const ROUTE_LABELS: Record<string, string> = {
  "/": "首页",
  "/productions": "看板",
  "/proposals": "选题池",
  "/publications": "发布管理",
  "/agents": "Agent 管理",
  "/templates": "模板管理",
  "/costs": "成本追踪",
  "/events": "事件日志",
  "/settings": "系统设置",
}
