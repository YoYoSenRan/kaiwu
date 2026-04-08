import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSettingsStore } from "@/stores/settings"
import { Activity, ChevronRight, Cpu, GitBranch, Languages, Layers, Monitor, Moon, Radio, Shield, Sun, Zap, ArrowUpRight } from "lucide-react"

// ============ 静态数据（业务标识不翻译） ============

const STATS = [
  { key: "uptime", value: "27", suffix: "d 14h", trend: "+2.4%", icon: Activity },
  { key: "requests", value: "1.4", suffix: "M / 24h", trend: "+12.1%", icon: Zap },
  { key: "latency", value: "38", suffix: "ms p50", trend: "−4.2%", icon: Radio },
  { key: "errors", value: "0.02", suffix: "%", trend: "−18%", icon: Shield },
] as const

const ACTIVITIES = [
  { time: "14:32:08", type: "DEPLOY", key: "deploy", id: "evt_8a3f21" },
  { time: "14:28:51", type: "MIGRATE", key: "migrate", id: "evt_8a3e08" },
  { time: "14:22:17", type: "ALERT", key: "alert", id: "evt_8a3c14" },
  { time: "14:11:03", type: "INDEX", key: "index", id: "evt_8a3a90" },
  { time: "13:58:44", type: "AUTH", key: "auth", id: "evt_8a385d" },
  { time: "13:42:11", type: "BACKUP", key: "backup", id: "evt_8a36c2" },
] as const

const SERVICES = [
  { name: "core", status: "OK", latency: 12, load: 34 },
  { name: "cache", status: "OK", latency: 3, load: 18 },
  { name: "queue", status: "OK", latency: 8, load: 51 },
  { name: "storage", status: "DEGRADED", latency: 142, load: 89 },
  { name: "search", status: "OK", latency: 21, load: 27 },
  { name: "edge", status: "OK", latency: 4, load: 12 },
] as const

const META_KEYS = ["region", "build", "branch", "operator"] as const
const META_VALUES = {
  region: "us-west-2a",
  build: "1247.stable",
  branch: "main → prod",
  operator: "atlas.local",
} as const

// ============ Hooks ============

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatUTC(date: Date) {
  return date.toISOString().slice(11, 19)
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, ".")
}

// ============ Header 控件 ============

/**
 * 主题切换按钮：循环 light → dark → system → light，图标随当前主题变化
 */
function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const { t } = useTranslation()

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor

  return (
    <button
      onClick={() => setTheme(next)}
      title={t("deck.controls.theme")}
      aria-label={t("deck.controls.theme")}
      className="flex items-center justify-center size-7 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon className="size-3.5" strokeWidth={1.5} />
    </button>
  )
}

/**
 * 语言切换按钮：在 zh-CN / en 之间切换，按钮文字反映"下一个"语言
 */
function LangToggle() {
  const { i18n, t } = useTranslation()
  const setLang = useSettingsStore((s) => s.setLang)
  const isZh = i18n.language.startsWith("zh")

  const toggle = () => {
    const next = isZh ? "en" : "zh-CN"
    i18n.changeLanguage(next)
    setLang(next)
  }

  return (
    <button
      onClick={toggle}
      title={t("deck.controls.language")}
      aria-label={t("deck.controls.language")}
      className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Languages className="size-3" strokeWidth={1.5} />
      <span className="text-xs tracking-[0.15em] font-mono uppercase">{isZh ? "EN" : "中"}</span>
    </button>
  )
}

// ============ 子组件 ============

function StatCard({ stat, index }: { stat: (typeof STATS)[number]; index: number }) {
  const { t } = useTranslation()
  const Icon = stat.icon
  return (
    <div className="group relative bg-background p-6 deck-rise transition-colors hover:bg-accent/30" style={{ animationDelay: `${280 + index * 70}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t(`deck.metrics.${stat.key}`)}</span>
        <Icon className="size-3.5 text-muted-foreground transition-colors group-hover:deck-accent" strokeWidth={1.5} />
      </div>
      <div className="mt-5 flex items-baseline gap-1.5 tabular">
        <span className="text-4xl font-light tracking-tight">{stat.value}</span>
        <span className="text-sm text-muted-foreground font-mono">{stat.suffix}</span>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs font-mono">
        <ArrowUpRight className="size-3 deck-accent" strokeWidth={2} />
        <span className="deck-accent">{stat.trend}</span>
        <span className="text-muted-foreground">{t("deck.metrics.vs7d")}</span>
      </div>
    </div>
  )
}

function ActivityRow({ activity, index }: { activity: (typeof ACTIVITIES)[number]; index: number }) {
  const { t } = useTranslation()
  return (
    <div className="group flex items-start gap-4 py-3 border-b border-border/50 last:border-b-0 deck-rise" style={{ animationDelay: `${600 + index * 50}ms` }}>
      <span className="text-xs font-mono text-muted-foreground tabular pt-0.5 w-[68px] shrink-0">{activity.time}</span>
      <span className="text-xs font-mono tracking-wider deck-accent w-[64px] shrink-0 pt-1">{activity.type}</span>
      <p className="flex-1 text-sm text-foreground/80 leading-relaxed">{t(`deck.activity.messages.${activity.key}`)}</p>
      <span className="text-xs font-mono text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity pt-1">{activity.id}</span>
    </div>
  )
}

function ServiceRow({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  const isHealthy = service.status === "OK"
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0 deck-rise" style={{ animationDelay: `${700 + index * 60}ms` }}>
      <span className={`size-1.5 rounded-full ${isHealthy ? "bg-foreground/70 deck-pulse" : "deck-accent-bg"}`} />
      <span className="text-sm font-mono w-16">{service.name}</span>
      <div className="flex-1 h-px bg-border relative overflow-hidden">
        <div className={`h-full ${isHealthy ? "bg-foreground/40" : "deck-accent-bg"}`} style={{ width: `${service.load}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular w-10 text-right">{service.load}%</span>
      <span className="text-xs font-mono text-muted-foreground tabular w-12 text-right">{service.latency}ms</span>
      <span className={`text-[10px] font-mono tracking-wider w-20 text-right ${isHealthy ? "text-muted-foreground" : "deck-accent"}`}>{service.status}</span>
    </div>
  )
}

// ============ 页面 ============

/**
 * Demo 首页：Operations Deck 设计语言的参考实现
 */
export default function Demo() {
  const now = useNow()
  const { t } = useTranslation()

  return (
    <div className="bg-background text-foreground">
      {/* ===== Header bar ===== */}
      <header className="relative flex items-center justify-between border-b border-border px-10 py-5 deck-fade">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="size-2 deck-accent-bg deck-pulse rounded-full" />
            <span className="text-xs tracking-[0.4em] font-medium">MERIDIAN</span>
          </div>
          <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("deck.subtitle")}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground tabular">
          <span>{formatDate(now)}</span>
          <span className="text-foreground">{formatUTC(now)} UTC</span>
          <span>v0.1.0</span>
          <div className="flex items-center gap-2 ml-2">
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="px-10 py-12 max-w-[1400px] mx-auto">
        {/* Hero section */}
        <section className="grid grid-cols-12 gap-12 items-end pb-16 border-b border-border">
          {/* 左：超大数字 */}
          <div className="col-span-7 deck-rise">
            <p className="text-xs tracking-[0.35em] text-muted-foreground uppercase">{t("deck.hero.label")}</p>
            <p className="mt-4 text-[180px] leading-[0.85] font-extralight tracking-[-0.05em] tabular">14</p>
            <p className="mt-6 text-sm text-muted-foreground max-w-md leading-relaxed">
              {t("deck.hero.description")}{" "}
              <span className="deck-accent cursor-pointer hover:underline underline-offset-4">{t("deck.hero.inspect")}</span>
            </p>
            <div className="mt-8 flex gap-8 text-sm">
              <div>
                <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("deck.hero.new")}</p>
                <p className="font-mono mt-1.5 text-base tabular">03</p>
              </div>
              <div className="border-l border-border pl-8">
                <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("deck.hero.pending")}</p>
                <p className="font-mono mt-1.5 text-base tabular deck-accent">02</p>
              </div>
              <div className="border-l border-border pl-8">
                <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("deck.hero.archived")}</p>
                <p className="font-mono mt-1.5 text-base tabular">09</p>
              </div>
              <div className="border-l border-border pl-8">
                <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{t("deck.hero.today")}</p>
                <p className="font-mono mt-1.5 text-base tabular">14</p>
              </div>
            </div>
          </div>

          {/* 右：metadata 面板 */}
          <div className="col-span-5 deck-rise" style={{ animationDelay: "120ms" }}>
            <div className="border-l-2 deck-accent-border pl-6 space-y-4">
              {META_KEYS.map((key) => (
                <div key={key} className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3 last:border-b-0">
                  <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t(`deck.meta.${key}`)}</span>
                  <span className="text-sm font-mono text-foreground">{META_VALUES[key]}</span>
                </div>
              ))}
              <div className="pt-2">
                <button className="group flex items-center gap-2 text-xs tracking-[0.2em] uppercase deck-accent hover:gap-3 transition-all">
                  {t("deck.meta.openConsole")}
                  <ChevronRight className="size-3" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats grid */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cpu className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("deck.metrics.title")}</h2>
            </div>
            <span className="text-xs tracking-[0.2em] text-muted-foreground font-mono uppercase">{t("deck.metrics.live")}</span>
          </div>
          <div className="grid grid-cols-4 gap-px deck-grid-bg border deck-grid-bg">
            {STATS.map((stat, i) => (
              <StatCard key={stat.key} stat={stat} index={i} />
            ))}
          </div>
        </section>

        {/* 底部：Activity + Services */}
        <section className="mt-16 grid grid-cols-12 gap-10">
          {/* Activity feed */}
          <div className="col-span-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Layers className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("deck.activity.title")}</h2>
              </div>
              <button className="text-xs tracking-[0.2em] text-muted-foreground hover:deck-accent transition-colors uppercase">{t("deck.activity.viewAll")}</button>
            </div>
            <div className="border-t border-border">
              {ACTIVITIES.map((activity, i) => (
                <ActivityRow key={activity.id} activity={activity} index={i} />
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="col-span-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <GitBranch className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("deck.services.title")}</h2>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{t("deck.services.summary")}</span>
            </div>
            <div className="border-t border-border">
              {SERVICES.map((service, i) => (
                <ServiceRow key={service.name} service={service} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-border flex items-center justify-between text-xs text-muted-foreground tracking-[0.2em] uppercase deck-fade" style={{ animationDelay: "1200ms" }}>
          <span>{t("deck.footer.name")}</span>
          <div className="flex items-center gap-6 font-mono normal-case tracking-normal">
            <span>{t("deck.footer.hint")}</span>
            <span>·</span>
            <span>
              {t("deck.footer.build")} {formatUTC(now).slice(0, 5)}
            </span>
          </div>
        </footer>
      </main>
    </div>
  )
}
