import { NavLink } from "react-router"
import { NAV_ITEMS } from "./nav-items"
import { useTranslation } from "react-i18next"
import { useSettingsStore } from "@/stores/settings"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

/**
 * 左侧导航栏：列出主菜单 + 折叠开关。
 * 折叠状态持久化在 settings store 的 sidebarCollapsed，首帧即可读到避免闪烁。
 */
export function Sidebar() {
  const { t } = useTranslation()
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)

  return (
    <aside
      className={`flex flex-col border-r border-border bg-background transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const label = t(item.labelKey)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center h-9 gap-3 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors ${
                  collapsed ? "justify-center px-0" : "px-4"
                } ${
                  isActive
                    ? "text-foreground border-l-2 deck-accent-border " + (collapsed ? "" : "pl-[14px]")
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                }`
              }
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <button
        onClick={toggleSidebar}
        aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
        className={`flex items-center h-9 gap-3 border-t border-border text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors ${
          collapsed ? "justify-center px-0" : "px-4"
        }`}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-3.5 shrink-0" strokeWidth={1.5} />
        ) : (
          <PanelLeftClose className="size-3.5 shrink-0" strokeWidth={1.5} />
        )}
      </button>
    </aside>
  )
}
