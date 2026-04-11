import { NAV_ITEMS } from "./nav-items"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Monitor, Moon, Sun } from "lucide-react"
import { useSettingsStore } from "@/stores/settings"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
    <header className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-2">
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

/**
 * 主题选择下拉：系统 / 亮色 / 暗色 三选一。
 * 触发按钮显示当前选项的图标（system→Monitor, light→Sun, dark→Moon）。
 * 选中项由 DropdownMenuRadioGroup 自动渲染 √ 指示器。
 */
function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const TriggerIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="switch theme">
          <TriggerIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" />
            {t("settings.themeSystem")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" />
            {t("settings.themeLight")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" />
            {t("settings.themeDark")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 语言选择下拉：zh-CN / en 二选一。
 * 触发按钮显示当前语言的简短徽标（"中" / "EN"）。
 * 切换时同步更新 i18next 运行时语言和 zustand store（缺一不可，见 i18n.md）。
 */
function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const lang = useSettingsStore((s) => s.lang)
  const setLang = useSettingsStore((s) => s.setLang)
  const badge = lang === "zh-CN" ? "中" : "EN"

  const handleChange = (next: string) => {
    if (next !== "zh-CN" && next !== "en") return
    i18n.changeLanguage(next)
    setLang(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="switch language">
          {badge}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={lang} onValueChange={handleChange}>
          <DropdownMenuRadioItem value="zh-CN">{t("settings.languageZh")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{t("settings.languageEn")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
