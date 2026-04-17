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

interface PageMeta {
  crumbs: Crumb[]
  headline: string
}

function usePageMeta(): PageMeta {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  if (pathname.startsWith("/knowledge/")) {
    return {
      crumbs: [{ label: "Kaiwu" }, { label: t("knowledge.title"), path: "/knowledge" }, { label: t("common.detail") }],
      headline: t("knowledge.description"),
    }
  }

  const item = NAV_ITEMS.find((n) => n.path === pathname)
  if (item) {
    return {
      crumbs: [{ label: "Kaiwu" }, { label: t(`${item.key}.title`) }],
      headline: t(`${item.key}.description`),
    }
  }

  return {
    crumbs: [{ label: "Kaiwu" }, { label: t("common.unknownPage") }],
    headline: "",
  }
}

export function Header() {
  const navigate = useNavigate()
  const { crumbs, headline } = usePageMeta()

  return (
    <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-3">
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
        {headline && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="text-muted-foreground text-xs">{headline}</div>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  )
}

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
