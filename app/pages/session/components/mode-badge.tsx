import { useTranslation } from "react-i18next"
import { Bot, Users } from "lucide-react"

interface Props {
  mode: "direct" | "group"
}

/** 单聊 / 群聊模式徽章。列表 + 详情共用。 */
export function ModeBadge({ mode }: Props) {
  const { t } = useTranslation()
  const Icon = mode === "group" ? Users : Bot
  const label = mode === "group" ? t("session.mode.group") : t("session.mode.direct")
  const tone = mode === "group" ? "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-400" : "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${tone}`}>
      <Icon className="size-2.5" aria-hidden />
      {label}
    </span>
  )
}
