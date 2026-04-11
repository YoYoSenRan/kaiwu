import { ListChecks } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"

/** 任务队列页：空态。后续接入任务列表。 */
export default function Task() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("task.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("task.description")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ListChecks className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("task.emptyTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("task.emptyDescription")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
