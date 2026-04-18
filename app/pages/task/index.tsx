import { ListChecks } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"

/** 任务队列页：空态。后续接入任务列表。 */
export default function Task() {
  const { t } = useTranslation()

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <ListChecks className="text-muted-foreground size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("task.emptyTitle")}</p>
            <p className="text-muted-foreground text-xs">{t("task.emptyDescription")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
