import { useTranslation } from "react-i18next"
import {
  Check,
  ChevronRight,
  Globe,
  LayoutTemplate,
  Monitor,
  Moon,
  Palette,
  Sun,
} from "lucide-react"
import { useSettingsStore } from "@/stores/settings"

const THEMES = [
  { key: "light", icon: Sun },
  { key: "dark", icon: Moon },
  { key: "system", icon: Monitor },
] as const

function ThemeCard() {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <div className="bg-background p-6 deck-rise" style={{ animationDelay: "280ms" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("settings.appearanceTitle")}</span>
        <Palette className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="mt-5 flex gap-2">
        {THEMES.map(({ key, icon: Icon }) => {
          const active = theme === key
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 h-8 border text-xs font-mono uppercase tracking-wider transition-colors ${active ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              <Icon className="size-3.5" strokeWidth={1.5} />
              {t(`settings.theme${key.charAt(0).toUpperCase() + key.slice(1)}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LanguageCard() {
  const { i18n: i18nInstance, t } = useTranslation()
  const setLang = useSettingsStore((s) => s.setLang)
  const isZh = i18nInstance.language.startsWith("zh")

  const choose = (next: "zh-CN" | "en") => {
    i18nInstance.changeLanguage(next)
    setLang(next)
  }

  return (
    <div className="bg-background p-6 deck-rise transition-colors " style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("settings.languageTitle")}</span>
        <Globe className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => choose("zh-CN")}
          className={`flex flex-1 items-center justify-center gap-1.5 h-8 border text-xs font-mono uppercase tracking-wider transition-colors ${isZh ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
        >
          {isZh && <Check className="size-3" strokeWidth={2} />}
          中
        </button>
        <button
          onClick={() => choose("en")}
          className={`flex flex-1 items-center justify-center gap-1.5 h-8 border text-xs font-mono uppercase tracking-wider transition-colors ${!isZh ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
        >
          {!isZh && <Check className="size-3" strokeWidth={2} />}
          EN
        </button>
      </div>
    </div>
  )
}

function LayoutCard() {
  const { t } = useTranslation()
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)

  return (
    <div className="bg-background p-6 deck-rise transition-colors " style={{ animationDelay: "420ms" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("settings.layoutTitle")}</span>
        <LayoutTemplate className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t("settings.sidebarLabel")}</span>
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={`relative h-5 w-9 border transition-colors ${collapsed ? "border-foreground bg-foreground" : "border-border"}`}
          aria-label="toggle sidebar"
        >
          <span
            className={`absolute top-0.5 size-3.5 bg-background transition-all ${collapsed ? "left-[calc(100%-18px)]" : "left-0.5"}`}
          />
        </button>
      </div>
    </div>
  )
}

function AboutCard() {
  const { t } = useTranslation()
  return (
    <div className="bg-background p-6 deck-rise transition-colors " style={{ animationDelay: "490ms" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{t("settings.aboutTitle")}</span>
        <span className="text-xs font-mono text-muted-foreground">v0.1.0</span>
      </div>
      <div className="mt-5">
        <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">{t("settings.versionLabel")}</p>
        <p className="mt-1 text-[48px] leading-none font-extralight tracking-[-0.03em] tabular">0.1.0</p>
        <div className="mt-4 space-y-2 text-sm font-mono text-muted-foreground">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span>{t("settings.buildLabel")}</span>
            <span className="text-foreground">2025.0412.1</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>{t("settings.deviceId")}</span>
            <span className="text-foreground">dev-1a2b3c</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 设置页面：Operations Deck 风格的偏好中心。 */
export default function Settings() {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const lang = useSettingsStore((s) => s.lang)
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)

  const themeLabel = theme === "light" ? t("settings.themeLight") : theme === "dark" ? t("settings.themeDark") : t("settings.themeSystem")
  const langLabel = lang === "zh-CN" ? "中" : "EN"
  const sidebarLabel = collapsed ? t("common.confirm") : t("common.cancel")

  return (
    <div>
      {/* Hero */}
      <section className="grid grid-cols-12 gap-12 items-end pb-12 border-b border-border">
        <div className="col-span-7 deck-rise">
          <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">{t("settings.overview")}</p>
          <h1 className="mt-4 text-[120px] leading-[0.85] font-extralight tracking-[-0.05em] tabular">{t("settings.title")}</h1>
          <p className="mt-6 text-sm text-muted-foreground max-w-md leading-relaxed">{t("settings.description")}</p>
          <div className="mt-8 flex gap-8 text-sm">
            <div>
              <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("settings.themeLabel")}</p>
              <p className="font-mono mt-1.5 text-base tabular">{themeLabel}</p>
            </div>
            <div className="border-l border-border pl-8">
              <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("settings.langLabel")}</p>
              <p className="font-mono mt-1.5 text-base tabular">{langLabel}</p>
            </div>
            <div className="border-l border-border pl-8">
              <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("settings.sidebarLabel")}</p>
              <p className="font-mono mt-1.5 text-base tabular">{sidebarLabel}</p>
            </div>
          </div>
        </div>

        <div className="col-span-5 deck-rise" style={{ animationDelay: "120ms" }}>
          <div className="border-l-2 deck-accent-border pl-6 space-y-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("settings.versionLabel")}</span>
              <span className="text-sm font-mono text-foreground">v0.1.0</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("settings.buildLabel")}</span>
              <span className="text-sm font-mono text-foreground">2025.0412.1</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("settings.deviceId")}</span>
              <span className="text-sm font-mono text-foreground">dev-1a2b3c</span>
            </div>
            <div className="pt-2">
              <button className="group flex items-center gap-2 text-xs tracking-[0.2em] uppercase deck-accent hover:gap-3 transition-all">
                {t("settings.viewLogs")}
                <ChevronRight className="size-3" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Settings grid */}
      <section className="mt-12">
        <div className="grid grid-cols-4 gap-px border border-border">
          <ThemeCard />
          <LanguageCard />
          <LayoutCard />
          <AboutCard />
        </div>
      </section>
    </div>
  )
}
