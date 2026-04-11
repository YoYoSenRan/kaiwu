import type { ReactNode } from "react"

interface HeroStat {
  label: string
  value: string
  /** 高亮数值（用 deck-accent 色），最多一个键用于强调"当前关键指标" */
  highlight?: boolean
}

interface DeckHeroProps {
  /** 顶部 10px 极小标签（已翻译，会被 CSS uppercase） */
  overview: string
  /** 120px 巨型标题（已翻译） */
  title: string
  /** 14px 次要描述（已翻译） */
  description: string
  /** 标题下方的 3 列汇总数字（第 4 列以上请自行在 children 里扩展） */
  stats?: HeroStat[]
  /** 右侧 5 列信息栏内容（border-l-2 deck-accent-border 已由壳提供） */
  aside: ReactNode
}

/**
 * Operations Deck 的页面顶部英雄区 shell。
 * 布局：12 列不对称 7+5，左侧 overview + 120px 标题 + description + 3 列汇总，
 * 右侧 deck-accent-border 引出的 aside 自定义内容。
 * 入场：左侧 0ms deck-rise，右侧 120ms stagger。
 */
export function DeckHero({ overview, title, description, stats, aside }: DeckHeroProps) {
  return (
    <section className="grid grid-cols-12 gap-12 items-end pb-12 border-b border-border">
      <div className="col-span-7 deck-rise">
        <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">{overview}</p>
        <h1 className="mt-4 text-[120px] leading-[0.85] font-extralight tracking-[-0.05em] tabular">{title}</h1>
        <p className="mt-6 text-sm text-muted-foreground max-w-md leading-relaxed">{description}</p>
        {stats && stats.length > 0 && (
          <div className="mt-8 flex gap-8 text-sm">
            {stats.map((stat, i) => (
              <div key={stat.label} className={i > 0 ? "border-l border-border pl-8" : undefined}>
                <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{stat.label}</p>
                <p className={`font-mono mt-1.5 text-base tabular ${stat.highlight ? "deck-accent" : ""}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="col-span-5 deck-rise" style={{ animationDelay: "120ms" }}>
        <div className="border-l-2 deck-accent-border pl-6 space-y-4">{aside}</div>
      </div>
    </section>
  )
}
