import { AgentCard } from "./card"
import type { AgentRow } from "@/types/agent"

interface Props {
  rows: AgentRow[]
  onSelect: (id: string) => void
}

/** 卡片网格容器。空态由父组件自己处理。 */
export function AgentGrid({ rows, onSelect }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <AgentCard key={row.id} row={row} onClick={onSelect} />
      ))}
    </div>
  )
}
