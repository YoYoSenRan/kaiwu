import { useTranslation } from "react-i18next"
import { DeckHero } from "@/components/deck/hero"
import { StatCard } from "@/components/deck/stat-card"
import { Activity, ArrowUpRight, Bot, GitBranch, Layers, MessageSquare, Radio, Zap } from "lucide-react"

const STATS = [
  { key: "agents", value: "03", suffix: "online", icon: Bot },
  { key: "tasks", value: "12", suffix: "pending", icon: Zap },
  { key: "chats", value: "48", suffix: "today", icon: MessageSquare },
  { key: "uptime", value: "99.9", suffix: "%", icon: Activity },
] as const

const ACTIVITIES = [
  { time: "09:14", event: "Agent dispatch completed · task #2041", id: "evt_a301" },
  { time: "08:52", event: "Knowledge index synced · 1,204 docs", id: "evt_a2f8" },
  { time: "08:31", event: "New connection established · mcp-local", id: "evt_a2d4" },
  { time: "07:45", event: "Daily backup flushed to cold storage", id: "evt_a2a1" },
] as const

const MODULES = [
  { name: "agent", status: "OK", load: 34 },
  { name: "task", status: "OK", load: 51 },
  { name: "chat", status: "OK", load: 27 },
  { name: "knowledge", status: "OK", load: 18 },
  { name: "connect", status: "DEGRADED", load: 89 },
] as const

function ActivityRow({ activity, index }: { activity: (typeof ACTIVITIES)[number]; index: number }) {
  return (
    <div className="group flex items-start gap-4 py-3 border-b border-border/50 last:border-b-0 deck-rise" style={{ animationDelay: `${600 + index * 50}ms` }}>
      <span className="text-xs font-mono text-muted-foreground tabular pt-0.5 w-12 shrink-0">{activity.time}</span>
      <p className="flex-1 text-sm text-foreground/80 leading-relaxed">{activity.event}</p>
      <span className="text-xs font-mono text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity pt-1">{activity.id}</span>
    </div>
  )
}

function ModuleRow({ module, index }: { module: (typeof MODULES)[number]; index: number }) {
  const { t } = useTranslation()
  const isHealthy = module.status === "OK"
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0 deck-rise" style={{ animationDelay: `${700 + index * 60}ms` }}>
      <span className={`size-1.5 rounded-full ${isHealthy ? "bg-foreground/70 deck-pulse" : "deck-accent-bg"}`} />
      <span className="text-sm font-mono w-20">{t(`dashboard.modules.${module.name}`)}</span>
      <div className="flex-1 h-px bg-border relative overflow-hidden">
        <div className={`h-full ${isHealthy ? "bg-foreground/40" : "deck-accent-bg"}`} style={{ width: `${module.load}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular w-10 text-right">{module.load}%</span>
      <span className={`text-[10px] font-mono tracking-wider w-20 text-right ${isHealthy ? "text-muted-foreground" : "deck-accent"}`}>{module.status}</span>
    </div>
  )
}

/** 仪表台：Operations Deck 风格的系统概览。 */
export default function Dashboard() {
  const { t } = useTranslation()

  return (
    <div>
      <DeckHero
        overview={t("dashboard.overview")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        stats={[
          { label: t("dashboard.stats.agents"), value: "03" },
          { label: t("dashboard.stats.tasks"), value: "12", highlight: true },
          { label: t("dashboard.stats.chats"), value: "48" },
        ]}
        aside={
          <>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">Version</span>
              <span className="text-sm font-mono text-foreground">v0.1.0</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">Environment</span>
              <span className="text-sm font-mono text-foreground">DEV</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">Status</span>
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="size-1.5 rounded-full deck-accent-bg deck-pulse" />
                <span className="text-foreground">ONLINE</span>
              </div>
            </div>
            <div className="pt-2">
              <button className="group flex items-center gap-2 text-xs tracking-[0.2em] uppercase deck-accent hover:gap-3 transition-all">
                {t("dashboard.inspect")}
                <ArrowUpRight className="size-3" strokeWidth={2} />
              </button>
            </div>
          </>
        }
      />

      {/* Stats grid */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Radio className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("dashboard.metricsTitle")}</h2>
          </div>
          <span className="text-xs tracking-[0.2em] text-muted-foreground font-mono uppercase">LIVE</span>
        </div>
        <div className="grid grid-cols-4 gap-px border border-border">
          {STATS.map((stat, i) => (
            <StatCard key={stat.key} label={t(`dashboard.stats.${stat.key}`)} value={stat.value} suffix={stat.suffix} icon={stat.icon} index={i} />
          ))}
        </div>
      </section>

      {/* Bottom: Activity + Modules */}
      <section className="mt-12 grid grid-cols-12 gap-10">
        <div className="col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Layers className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("dashboard.activityTitle")}</h2>
            </div>
            <button className="text-xs tracking-[0.2em] text-muted-foreground hover:deck-accent transition-colors uppercase">{t("dashboard.viewAll")}</button>
          </div>
          <div className="border-t border-border">
            {ACTIVITIES.map((activity, i) => (
              <ActivityRow key={activity.id} activity={activity} index={i} />
            ))}
          </div>
        </div>

        <div className="col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <GitBranch className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("dashboard.modulesTitle")}</h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">4/5 OK</span>
          </div>
          <div className="border-t border-border">
            {MODULES.map((module, i) => (
              <ModuleRow key={module.name} module={module} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
