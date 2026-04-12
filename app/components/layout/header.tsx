import { NAV_ITEMS } from "@/config/nav"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Monitor, Moon, Sun } from "lucide-react"
import { useSettingsStore } from "@/stores/settings"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

interface Crumb {
  label: string
  path?: string
}

/**
 * 根据当前路径生成面包屑层级。
 * 目前只处理 /agent/:id 这种两层结构，其他路由直接映射 NAV_ITEMS。
 */
function useBreadcrumbs(): Crumb[] {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  if (pathname.startsWith("/agent/")) {
    return [{ label: t("nav.agent"), path: "/agent" }, { label: t("common.detail") }]
  }

  if (pathname.startsWith("/knowledge/")) {
    return [{ label: t("knowledge.title"), path: "/knowledge" }, { label: t("common.detail") }]
  }

  const item = NAV_ITEMS.find((n) => n.path === pathname)
  if (item) {
    return [{ label: t(`${item.key}.title`) }]
  }

  return [{ label: t("common.unknownPage") }]
}

/**
 * 全局头部：侧栏折叠按钮 + 分隔线 + 面包屑导航 + 右侧主题/语言切换。
 * 面包屑支持多级可点击返回，当前页仅展示不可点击。
 */
export function Header() {
  const navigate = useNavigate()
  const crumbs = useBreadcrumbs()

  return (
    <header className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-2">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1
            return (
              <Fragment key={idx}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <button type="button" onClick={() => crumb.path && navigate(crumb.path)} className="cursor-pointer">
                        {crumb.label}
                      </button>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
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
