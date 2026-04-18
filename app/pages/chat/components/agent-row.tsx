import { useTranslation } from "react-i18next"
import type { AgentFixture } from "../data"

interface Props {
  agent: AgentFixture
}

/** Tailwind JIT 要求 class 字面量存在，动态 `bg-${x}/10` 不会被扫描到——用静态 map。 */
const COLOR_CLASS: Record<AgentFixture["color"], { bg: string; bgHover: string; ring: string; text: string }> = {
  primary: { bg: "bg-primary/10", bgHover: "group-hover:bg-primary/20", ring: "ring-primary/20", text: "text-primary" },
  "chart-2": { bg: "bg-chart-2/10", bgHover: "group-hover:bg-chart-2/20", ring: "ring-chart-2/20", text: "text-chart-2" },
  "chart-3": { bg: "bg-chart-3/10", bgHover: "group-hover:bg-chart-3/20", ring: "ring-chart-3/20", text: "text-chart-3" },
  "chart-4": { bg: "bg-chart-4/10", bgHover: "group-hover:bg-chart-4/20", ring: "ring-chart-4/20", text: "text-chart-4" },
  "chart-5": { bg: "bg-chart-5/10", bgHover: "group-hover:bg-chart-5/20", ring: "ring-chart-5/20", text: "text-chart-5" },
}

export function AgentRow({ agent }: Props) {
  const { t } = useTranslation()
  const Icon = agent.icon
  const c = COLOR_CLASS[agent.color]

  return (
    <div className="group hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors">
      <div className={`flex size-9 items-center justify-center rounded-full ring-1 transition-colors ${c.bg} ${c.ring} ${c.bgHover}`}>
        <Icon className={`size-5 ${c.text}`} />
      </div>
      <div className="flex flex-col justify-center">
        <span className="mb-1.5 text-sm leading-none font-medium">{t(agent.nameKey)}</span>
        <span className="text-muted-foreground text-[11px] leading-none">{t(agent.descKey)}</span>
      </div>
    </div>
  )
}
