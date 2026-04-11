import { motion } from "motion/react"
import { AgentCard } from "./card"
import type { AgentRow } from "@/types/agent"

interface Props {
  rows: AgentRow[]
  onSelect: (id: string) => void
}

/** 卡片网格容器。空态由父组件自己处理。 */
export function AgentGrid({ rows, onSelect }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row, idx) => (
        <motion.div
          key={row.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.03, ease: [0.4, 0, 0.2, 1] }}
        >
          <AgentCard row={row} onClick={onSelect} />
        </motion.div>
      ))}
    </div>
  )
}
