import { Moon, Sun } from "lucide-react"
import { NAV_ITEMS } from "./nav-items"
import { useLocation } from "react-router"
import { useTranslation } from "react-i18next"
import { useSettingsStore } from "@/stores/settings"

/**
 * 全局头部：左侧当前页大号 uppercase label，右侧主题 + 语言切换。
 * 页面 label 通过路由匹配 NAV_ITEMS 得到，未在 NAV_ITEMS 的路由降级显示 REFERENCE。
 */
export function Header() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const item = NAV_ITEMS.find((n) => n.path === pathname)
  const label = item ? t(`${item.key}.label`) : "REFERENCE"

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-10">
      <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">{label}</p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  )
}

/** 主题切换按钮：在 light / dark 之间循环。 */
function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const isDark = theme === "dark"
  const Icon = isDark ? Sun : Moon
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="toggle theme"
      className="flex size-7 items-center justify-center border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon className="size-3.5" strokeWidth={1.5} />
    </button>
  )
}

/** 语言切换按钮：在 zh-CN / en 之间切换，同步 i18next 与 store。 */
function LanguageToggle() {
  const { i18n } = useTranslation()
  const lang = useSettingsStore((s) => s.lang)
  const setLang = useSettingsStore((s) => s.setLang)
  const isZh = lang === "zh-CN"
  const nextLang = isZh ? "en" : "zh-CN"
  const badge = isZh ? "EN" : "中"
  return (
    <button
      onClick={() => {
        // 同时更新运行时语言和持久化状态，缺一不可
        i18n.changeLanguage(nextLang)
        setLang(nextLang)
      }}
      aria-label="toggle language"
      className="flex h-7 min-w-7 items-center justify-center px-2 border border-border text-[10px] font-mono tracking-[0.1em] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {badge}
    </button>
  )
}
