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
    <div className="border-border/40 bg-background/60 flex w-[68px] shrink-0 flex-col items-center border-r py-4 backdrop-blur-xl transition-colors">
      {/* Brand Icon */}
      <div className="bg-card ring-border/10 mb-6 flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 transition-colors">
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
                "group relative flex w-14 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all duration-300",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] leading-none font-medium tracking-wide">{label}</span>
              {/* Active Indicator Line */}
              {isActive && <div className="bg-primary absolute top-1/2 -left-[6px] h-6 w-[3px] -translate-y-1/2 rounded-r-full" />}
            </NavLink>
          )
        })}

        {/* Settings Button */}
        {settingsNav &&
          (() => {
            const SettingsIcon = settingsNav.icon
            return (
              <div className="mt-auto flex w-full justify-center">
                <NavLink
                  to={settingsNav.path}
                  className={cn(
                    "group relative flex w-14 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all duration-300",
                    pathname.startsWith(settingsNav.path) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <SettingsIcon className="size-5" />
                  <span className="text-[10px] leading-none font-medium tracking-wide">{t(`nav.${settingsNav.key}`)}</span>
                  {pathname.startsWith(settingsNav.path) && <div className="bg-primary absolute top-1/2 -left-[6px] h-6 w-[3px] -translate-y-1/2 rounded-r-full" />}
                </NavLink>
              </div>
            )
          })()}
      </nav>
    </div>
  )
}
