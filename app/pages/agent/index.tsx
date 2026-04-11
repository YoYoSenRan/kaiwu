import { Plus, Bot } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/** 智能体管理页：空态 + 新建入口。后续接入 agent 列表。 */
export default function Agent() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("agent.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("agent.description")}</p>
        </div>
        <Button>
          <Plus className="mr-1.5 size-4" />
          {t("agent.createAgent")}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Bot className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("agent.emptyTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("agent.emptyDescription")}</p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-1.5 size-4" />
            {t("agent.createAgent")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
