import { Bot, CloudOff, Unlink } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  type: "mine" | "unsynced" | "missing"
}

const ICON_MAP = {
  mine: Bot,
  unsynced: CloudOff,
  missing: Unlink,
} as const

const TITLE_KEY_MAP = {
  mine: "agent.emptyTitle",
  unsynced: "agent.list.unsyncedEmptyTitle",
  missing: "agent.list.missingEmptyTitle",
} as const

const DESC_KEY_MAP = {
  mine: "agent.emptyDescription",
  unsynced: "agent.list.unsyncedEmptyDescription",
  missing: "agent.list.missingEmptyDescription",
} as const

export function EmptyState({ type }: Props) {
  const { t } = useTranslation()
  const Icon = ICON_MAP[type]

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <Icon className="text-muted-foreground size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t(TITLE_KEY_MAP[type])}</p>
            <p className="text-muted-foreground max-w-[280px] text-xs">{t(DESC_KEY_MAP[type])}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
