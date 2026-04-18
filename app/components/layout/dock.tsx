import { Zap } from "lucide-react"
import { NAV_ITEMS } from "@/config/nav"
import { useTranslation } from "react-i18next"
import { NavLink, useLocation } from "react-router"
import { cn } from "@/utils/utils"

export function NanoDock() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // 区分普通导航和设置（放到底部）
  const topNavs = NAV_ITEMS.filter((item) => item.key !== "settings")
  const settingsNav = NAV_ITEMS.find((item) => item.key === "settings")

  return (
    <div className="border-border/40 bg-background/60 flex w-[68px] shrink-0 flex-col items-center border-r py-4 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)] backdrop-blur-xl transition-colors">
      {/* Brand Icon */}
      <div className="from-card to-muted ring-border/20 mb-6 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b shadow-[0_2px_10px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">
        <Zap className="text-primary size-5 drop-shadow-[0_0_8px_var(--color-primary)]" strokeWidth={2.5} />
      </div>

      {/* Nav Links */}
      <nav className="flex w-full flex-1 flex-col items-center gap-4">
        {topNavs.map((item) => {
          const Icon = item.icon
          const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
          const label = t(`nav.${item.key}`)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={cn(
                "group relative flex size-12 flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground active:scale-95",
              )}
            >
              <Icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
              <span className={cn("text-[10px] leading-none tracking-wider", isActive ? "font-semibold" : "font-medium")}>{label}</span>
            </NavLink>
          )
        })}

        {/* Settings Button */}
        {settingsNav &&
          (() => {
            const SettingsIcon = settingsNav.icon
            const isActive = pathname.startsWith(settingsNav.path)
            return (
              <div className="mt-auto flex w-full justify-center">
                <NavLink
                  to={settingsNav.path}
                  className={cn(
                    "group relative flex size-12 flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground active:scale-95",
                  )}
                >
                  <SettingsIcon className="size-5 transition-transform duration-300 group-hover:rotate-45" />
                  <span className={cn("text-[10px] leading-none tracking-wider", isActive ? "font-semibold" : "font-medium")}>{t(`nav.${settingsNav.key}`)}</span>
                </NavLink>
              </div>
            )
          })()}
      </nav>
    </div>
  )
}
