import { Moon, Sun } from "lucide-react"
import { NAV_ITEMS } from "./nav-items"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useSettingsStore } from "@/stores/settings"

/**
 * 全局头部：侧栏折叠按钮 + 分隔线 + 当前页标题 + 右侧主题/语言切换。
 * 路由匹配 NAV_ITEMS 得到页面标题，未命中的路由降级显示 "Reference"。
 */
export function Header() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const item = NAV_ITEMS.find((n) => n.path === pathname)
  const title = item ? t(`${item.key}.title`) : "Reference"

  return (
    <header className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-2">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
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
    <Button variant="ghost" size="icon" aria-label="toggle theme" onClick={() => setTheme(isDark ? "light" : "dark")}>
      <Icon className="size-4" />
    </Button>
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
    <Button
      variant="ghost"
      size="sm"
      aria-label="toggle language"
      onClick={() => {
        // 同时更新运行时语言和持久化状态，缺一不可
        i18n.changeLanguage(nextLang)
        setLang(nextLang)
      }}
    >
      {badge}
    </Button>
  )
}
