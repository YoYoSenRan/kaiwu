import { Bot, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface AgentFixture {
  id: string
  icon: LucideIcon
  /** token 色板 key，用于 `text-${color}` / `bg-${color}/10` / `border-${color}/20` */
  color: "primary" | "chart-2" | "chart-3" | "chart-4" | "chart-5"
  nameKey: string
  descKey: string
}

export const SAMPLE_AGENTS: AgentFixture[] = [
  { id: "coder", icon: Bot, color: "primary", nameKey: "chat.agent.coder.name", descKey: "chat.agent.coder.desc" },
  { id: "designer", icon: Users, color: "chart-2", nameKey: "chat.agent.designer.name", descKey: "chat.agent.designer.desc" },
]

export interface SessionFixture {
  id: string
  titleKey: string
  /** t() 插值参数 */
  titleParams?: Record<string, string | number>
  timeKey: string
  timeParams?: Record<string, string | number>
  active?: boolean
}

export const SAMPLE_SESSIONS: SessionFixture[] = [
  { id: "s1", titleKey: "chat.sample.title", timeKey: "chat.time.justNow", active: true },
  { id: "s2", titleKey: "chat.sample.previous", timeKey: "chat.time.hoursAgo", timeParams: { count: 2 } },
  { id: "s3", titleKey: "chat.sample.previous", timeKey: "chat.time.hoursAgo", timeParams: { count: 3 } },
  { id: "s4", titleKey: "chat.sample.previous", timeKey: "chat.time.hoursAgo", timeParams: { count: 4 } },
  { id: "s5", titleKey: "chat.sample.previous", timeKey: "chat.time.hoursAgo", timeParams: { count: 5 } },
]
