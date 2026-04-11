import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  /** 已翻译的标签文字（10px uppercase tracking-0.3em） */
  label: string
  /** 主数值（text-4xl font-light） */
  value: string
  /** 数值右侧单位后缀，可选 */
  suffix?: string
  /** 右上角图标 */
  icon: LucideIcon
  /** 在 stagger 序列中的下标，用于 animationDelay 计算 */
  index: number
  /** stagger 基础延迟（ms），默认 280 */
  baseDelay?: number
  /** stagger 步进（ms），默认 70 */
  stepDelay?: number
}

/**
 * Operations Deck 的 4 列网格卡片。
 * 与 dashboard/agent/task 的 stat grid 共用：左上 label + 右上 icon + 底部大数字 + 单位。
 * Hover 时 icon 变 accent 色。入场用 deck-rise stagger。
 */
export function StatCard({ label, value, suffix, icon: Icon, index, baseDelay = 280, stepDelay = 70 }: StatCardProps) {
  return (
    <div className="group bg-background p-6 deck-rise transition-colors" style={{ animationDelay: `${baseDelay + index * stepDelay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{label}</span>
        <Icon className="size-3.5 text-muted-foreground transition-colors group-hover:deck-accent" strokeWidth={1.5} />
      </div>
      <div className="mt-5 flex items-baseline gap-1.5 tabular">
        <span className="text-4xl font-light tracking-tight">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground font-mono">{suffix}</span>}
      </div>
    </div>
  )
}
