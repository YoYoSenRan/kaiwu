import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useSettingsStore } from "@/stores/settings"

const THEMES = [
  { key: "light", icon: Sun },
  { key: "dark", icon: Moon },
  { key: "system", icon: Monitor },
] as const

/** 外观设置：主题、语言、侧边栏。 */
export function AppearanceCard() {
  const { t, i18n: i18nInstance } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)
  const setLang = useSettingsStore((s) => s.setLang)
  const isZh = i18nInstance.language.startsWith("zh")

  const chooseLang = (next: "zh-CN" | "en") => {
    i18nInstance.changeLanguage(next)
    setLang(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("settings.themeLabel")}</Label>
        <div className="flex gap-1">
          {THEMES.map(({ key, icon: Icon }) => (
            <Button key={key} variant={theme === key ? "default" : "outline"} size="sm" onClick={() => setTheme(key)}>
              <Icon className="mr-1.5 size-3.5" />
              {t(`settings.theme${key.charAt(0).toUpperCase() + key.slice(1)}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("settings.langLabel")}</Label>
        <div className="flex gap-1">
          <Button variant={isZh ? "default" : "outline"} size="sm" onClick={() => chooseLang("zh-CN")}>
            中文
          </Button>
          <Button variant={!isZh ? "default" : "outline"} size="sm" onClick={() => chooseLang("en")}>
            English
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="sidebar-collapse" className="text-sm">
            {t("settings.sidebarLabel")}
          </Label>
          <p className="text-muted-foreground mt-0.5 text-xs">{t("settings.sidebarHint")}</p>
        </div>
        <Switch id="sidebar-collapse" checked={collapsed} onCheckedChange={setSidebarCollapsed} />
      </div>
    </div>
  )
}
