import { Zap } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router"
import { NAV_ITEMS } from "./nav-items"

import { useSettingsStore } from "@/stores/settings"

/**
 * 左侧导航栏：顶部 Logo 条（点击切换折叠）+ 菜单列表。
 * 折叠状态持久化在 settings store 的 sidebarCollapsed，首帧即可读到避免闪烁。
 * 另可通过 Cmd/Ctrl+B 快捷键切换（见 use-sidebar-shortcut.ts）。
 */
export function Sidebar() {
  const { t } = useTranslation()
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)

  return (
    <aside className={`flex flex-col border-r border-border bg-background transition-[width] duration-200 ${collapsed ? "w-16" : "w-56"}`}>
      {/* 顶部 Logo 条：高度与 Header 一致（h-12），整条点击切换折叠 */}
      <button
        onClick={toggleSidebar}
        aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
        className={`flex h-12 shrink-0 items-center gap-3 border-b border-border transition-colors hover:bg-accent/30 ${collapsed ? "justify-center px-0" : "px-4"}`}
      >
        <Zap className="size-4 shrink-0 deck-accent" strokeWidth={1.5} />
        {!collapsed && (
          <div className="flex flex-col items-start leading-tight">
            <span className="font-mono text-[12px] tracking-[0.15em] text-foreground uppercase">Kaiwu</span>
            <span className="text-[9px] tracking-[0.2em] text-muted-foreground">开物</span>
          </div>
        )}
      </button>

      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const label = t(`nav.${item.key}`)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                collapsed
                  ? `flex h-14 flex-col items-center justify-center gap-1.5 font-mono uppercase transition-colors ${
                      isActive ? "text-foreground border-l-2 deck-accent-border" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    }`
                  : `flex h-9 items-center gap-3 px-4 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors ${
                      isActive ? "text-foreground border-l-2 deck-accent-border pl-[14px]" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    }`
              }
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span className={collapsed ? "text-[9px] tracking-[0.05em]" : "truncate"}>{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
