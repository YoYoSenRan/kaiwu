import { useState } from "react"
import { useTranslation } from "react-i18next"
import { DeckHero } from "@/components/deck/hero"
import { StatCard } from "@/components/deck/stat-card"
import { ArrowUpRight, CheckCircle2, Clock, ListChecks, Play, RotateCcw, X, XCircle } from "lucide-react"

const TASKS = [
  { id: "tsk_01", name: "Index knowledge base", status: "running", progress: 64, eta: "02m 14s" },
  { id: "tsk_02", name: "Deploy agent update", status: "pending", progress: 0, eta: "—" },
  { id: "tsk_03", name: "Sync MCP connections", status: "completed", progress: 100, eta: "Done" },
  { id: "tsk_04", name: "Cleanup old snapshots", status: "failed", progress: 12, eta: "Error" },
] as const

const STATS = [
  { key: "total", value: "12", suffix: "", icon: ListChecks },
  { key: "running", value: "01", suffix: "", icon: Play },
  { key: "completed", value: "08", suffix: "", icon: CheckCircle2 },
  { key: "failed", value: "01", suffix: "", icon: XCircle },
] as const

function getStatusDot(status: string) {
  if (status === "running") return "bg-foreground/70 deck-pulse"
  if (status === "failed") return "deck-accent-bg"
  return "bg-muted-foreground/50"
}

function getProgressColor(status: string) {
  if (status === "failed") return "deck-accent-bg"
  if (status === "pending") return "bg-muted-foreground/30"
  return "bg-foreground/40"
}

/** 任务页面：Operations Deck 风格的任务队列与执行历史。 */
export default function Task() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string>(TASKS[0].id)
  const selected = TASKS.find((a) => a.id === selectedId) ?? TASKS[0]

  return (
    <div>
      <DeckHero
        overview={t("task.overview")}
        title={t("task.title")}
        description={t("task.description")}
        stats={[
          { label: t("task.stats.pending"), value: "02" },
          { label: t("task.stats.running"), value: "01", highlight: true },
          { label: t("task.stats.completed"), value: "08" },
        ]}
        aside={
          <>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("task.queueStatus")}</span>
              <span className="text-sm font-mono text-foreground">NORMAL</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("task.avgDuration")}</span>
              <span className="text-sm font-mono text-foreground">4m 12s</span>
            </div>
            <div className="pt-2">
              <button className="group flex items-center gap-2 text-xs tracking-[0.2em] uppercase deck-accent hover:gap-3 transition-all">
                {t("task.inspect")}
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
            <Clock className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("task.metricsTitle")}</h2>
          </div>
          <span className="text-xs tracking-[0.2em] text-muted-foreground font-mono uppercase">LIVE</span>
        </div>
        <div className="grid grid-cols-4 gap-px border border-border">
          {STATS.map((stat, i) => (
            <StatCard key={stat.key} label={t(`task.stats.${stat.key}`)} value={stat.value} suffix={stat.suffix} icon={stat.icon} index={i} />
          ))}
        </div>
      </section>

      {/* Bottom: Queue + Detail */}
      <section className="mt-12 grid grid-cols-12 gap-10">
        {/* Queue */}
        <div className="col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ListChecks className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("task.queueTitle")}</h2>
            </div>
            <button className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("task.clearCompleted")}</span>
            </button>
          </div>
          <div className="border-t border-border">
            {TASKS.map((task, i) => (
              <div
                key={task.id}
                onClick={() => setSelectedId(task.id)}
                className={`group flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0 deck-rise cursor-pointer transition-colors hover:bg-accent/20 ${selectedId === task.id ? "bg-accent/10" : ""}`}
                style={{ animationDelay: `${600 + i * 60}ms` }}
              >
                <span className={`size-1.5 rounded-full ${getStatusDot(task.status)}`} />
                <span className="text-sm font-mono w-44 truncate">{task.name}</span>
                <div className="flex-1 h-px bg-border relative overflow-hidden">
                  <div className={`h-full ${getProgressColor(task.status)}`} style={{ width: `${task.progress}%` }} />
                </div>
                <span className="text-xs font-mono text-muted-foreground tabular w-12 text-right">{task.progress}%</span>
                <span className="text-xs font-mono text-muted-foreground tabular w-16 text-right">{task.eta}</span>
                <span className={`text-[10px] font-mono tracking-wider w-20 text-right ${task.status === "failed" ? "deck-accent" : "text-muted-foreground"}`}>
                  {task.status.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity w-14 text-right">{task.id}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Play className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{t("task.detailTitle")}</h2>
            </div>
            <div className="flex items-center gap-2">
              {selected.status === "failed" ? (
                <button className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <RotateCcw className="size-3" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("task.retry")}</span>
                </button>
              ) : (
                <button className="flex items-center gap-1.5 h-7 px-2.5 border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <X className="size-3" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-[0.15em] font-mono uppercase">{t("task.cancel")}</span>
                </button>
              )}
            </div>
          </div>
          <div className="border border-border p-6 space-y-4 deck-rise" style={{ animationDelay: "720ms" }}>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("task.detailName")}</span>
              <span className="text-sm font-mono text-foreground">{selected.name}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("task.detailStatus")}</span>
              <div className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${getStatusDot(selected.status)}`} />
                <span className={`text-sm font-mono ${selected.status === "failed" ? "deck-accent" : "text-foreground"}`}>{selected.status.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("task.detailProgress")}</span>
              <span className="text-sm font-mono text-foreground tabular">{selected.progress}%</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 pb-1">
              <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase shrink-0">{t("task.detailEta")}</span>
              <span className="text-sm font-mono text-foreground tabular">{selected.eta}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
