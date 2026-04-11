import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { OpenClawCard } from "./components/openclaw-card"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/stores/settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const THEMES = [
  { key: "light", icon: Sun },
  { key: "dark", icon: Moon },
  { key: "system", icon: Monitor },
] as const

/** 设置页：shadcn Card + Switch + Button 构建偏好中心。 */
export default function Settings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.description")}</p>
      </div>

      <AppearanceCard />
      <OpenClawCard />
      <AboutCard />
    </div>
  )
}

/** 外观设置：主题 + 语言 + 布局偏好。 */
function AppearanceCard() {
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
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.appearanceTitle")}</CardTitle>
        <CardDescription>{t("settings.appearanceDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{t("settings.themeLabel")}</Label>
          <div className="flex gap-1">
            {THEMES.map(({ key, icon: Icon }) => (
              <Button key={key} variant={theme === key ? "default" : "outline"} size="sm" onClick={() => setTheme(key)}>
                <Icon className="mr-1.5 size-3.5" />
                {t(`settings.theme${key.charAt(0).toUpperCase() + key.slice(1)}`)}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Label>{t("settings.langLabel")}</Label>
          <div className="flex gap-1">
            <Button variant={isZh ? "default" : "outline"} size="sm" onClick={() => chooseLang("zh-CN")}>
              中文
            </Button>
            <Button variant={!isZh ? "default" : "outline"} size="sm" onClick={() => chooseLang("en")}>
              English
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sidebar-collapse">{t("settings.sidebarLabel")}</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("settings.sidebarHint")}</p>
          </div>
          <Switch id="sidebar-collapse" checked={collapsed} onCheckedChange={setSidebarCollapsed} />
        </div>
      </CardContent>
    </Card>
  )
}

/** 关于：版本、构建、设备 ID。 */
function AboutCard() {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.aboutTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
          <dt className="text-muted-foreground">{t("settings.versionLabel")}</dt>
          <dd className="font-mono">v0.1.0</dd>
          <dt className="text-muted-foreground">{t("settings.buildLabel")}</dt>
          <dd className="font-mono">2025.0412.1</dd>
          <dt className="text-muted-foreground">{t("settings.deviceId")}</dt>
          <dd className="font-mono">dev-1a2b3c</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
