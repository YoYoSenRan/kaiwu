import { useState } from "react"
import { useTranslation } from "react-i18next"
import { DeckHero } from "@/components/deck/hero"
import { StatCard } from "@/components/deck/stat-card"
import { Activity, AlertCircle, ArrowUpRight, Bot, Cpu, Play, Plus, Square, Zap } from "lucide-react"

const AGENTS = [
  { id: "agt_01", name: "Explorer Alpha", type: "explorer", status: "running", load: 72, tasks: 1247 },
  { id: "agt_02", name: "Executor Prime", type: "executor", status: "idle", load: 12, tasks: 89 },
  { id: "agt_03", name: "Planner Core", type: "planner", status: "paused", load: 0, tasks: 342 },
  { id: "agt_04", name: "Reviewer X1", type: "reviewer", status: "error", load: 0, tasks: 56 },
] as const

const STATS = [
  { key: "total", value: "04", suffix: "", icon: Bot },
  { key: "running", value: "01", suffix: "", icon: Zap },
  { key: "idle", value: "01", suffix: "", icon: Activity },
  { key: "errors", value: "01", suffix: "", icon: AlertCircle },
] as const

function getStatusDot(status: string) {
  if (status === "running") return "bg-foreground/70 deck-pulse"
  if (status === "error") return "deck-accent-bg"
  return "bg-muted-foreground/50"
}

function getLoadBarColor(status: string) {
  if (status === "error") return "deck-accent-bg"
  if (status === "paused") return "bg-muted-foreground/30"
  return "bg-foreground/40"
}

/** 智能体页面：Operations Deck 风格的 Agent 总览。 */
export default function Agent() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string>(AGENTS[0].id)
  const selected = AGENTS.find((a) => a.id === selectedId) ?? AGENTS[0]

  return (
    <div>
      <DeckHero
        overview={t("agent.overview")}
        title={t("agent.title")}
        description={t("agent.description")}
        stats={[
          { label: t("agent.stats.total"), value: "04" },
          { label: t("agent.stats.running"), value: "01", highlight: true },
          { label: t("agent.stats.idle"), value: "01" },
        ]}
        aside={
          <>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("agent.latestError")}</span>
              <span className="text-sm font-mono text-foreground">Reviewer X1</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("agent.errorCode")}</span>
              <span className="text-sm font-mono deck-accent">CONN_TIMEOUT</span>
            </div>
            <div className="pt-2">
              <button className="group flex items-center gap-2 text-xs tracking-[0.2em] uppercase deck-accent hover:gap-3 transition-all">
                {t("agent.inspect")}
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
            <Cpu className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("agent.metricsTitle")}</h2>
          </div>
          <span className="text-xs tracking-[0.2em] text-muted-foreground font-mono uppercase">LIVE</span>
        </div>
        <div className="grid grid-cols-4 gap-px border border-border">
          {STATS.map((stat, i) => (
            <StatCard key={stat.key} label={t(`agent.stats.${stat.key}`)} value={stat.value} suffix={stat.suffix} icon={stat.icon} index={i} />
          ))}
        </div>
      </section>

      {/* Bottom: Agent list + Detail */}
      <section className="mt-12 grid grid-cols-12 gap-10">
        {/* List */}
        <div className="col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bot className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("agent.listTitle")}</h2>
            </div>
            <button className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Plus className="size-3" strokeWidth={1.5} />
              <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("agent.createAgent")}</span>
            </button>
          </div>
          <div className="border-t border-border">
            {AGENTS.map((agent, i) => (
              <div
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                className={`group flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0 deck-rise cursor-pointer transition-colors hover:bg-accent/20 ${selectedId === agent.id ? "bg-accent/10" : ""}`}
                style={{ animationDelay: `${600 + i * 60}ms` }}
              >
                <span className={`size-1.5 rounded-full ${getStatusDot(agent.status)}`} />
                <span className="text-sm font-mono w-28">{agent.name}</span>
                <span className="text-xs text-muted-foreground font-mono w-20">{t(`agent.types.${agent.type}`)}</span>
                <div className="flex-1 h-px bg-border relative overflow-hidden">
                  <div className={`h-full ${getLoadBarColor(agent.status)}`} style={{ width: `${agent.load}%` }} />
                </div>
                <span className="text-xs font-mono text-muted-foreground tabular w-10 text-right">{agent.load}%</span>
                <span className={`text-[10px] font-mono tracking-wider w-16 text-right ${agent.status === "error" ? "deck-accent" : "text-muted-foreground"}`}>
                  {agent.status.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity w-16 text-right">{agent.id}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("agent.detailTitle")}</h2>
            </div>
            <div className="flex items-center gap-2">
              {selected.status === "running" ? (
                <button className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <Square className="size-3" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("agent.stop")}</span>
                </button>
              ) : (
                <button className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <Play className="size-3" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("agent.start")}</span>
                </button>
              )}
            </div>
          </div>
          <div className="border border-border p-6 space-y-4 deck-rise" style={{ animationDelay: "720ms" }}>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("agent.detailName")}</span>
              <span className="text-sm font-mono text-foreground">{selected.name}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("agent.detailType")}</span>
              <span className="text-sm font-mono text-foreground">{t(`agent.types.${selected.type}`)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("agent.detailStatus")}</span>
              <div className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${getStatusDot(selected.status)}`} />
                <span className={`text-sm font-mono ${selected.status === "error" ? "deck-accent" : "text-foreground"}`}>{selected.status.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("agent.detailLoad")}</span>
              <span className="text-sm font-mono text-foreground tabular">{selected.load}%</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 pb-1">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("agent.detailTasks")}</span>
              <span className="text-sm font-mono text-foreground tabular">{selected.tasks}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
