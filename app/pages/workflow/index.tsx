import { useTranslation } from "react-i18next"
import { Workflow as WorkflowIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Workflow() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight">{t("workflow.title", "Workflow")}</h1>
          <p className="text-muted-foreground text-sm">{t("workflow.description", "Visual pipeline and automation design")}</p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 size-4" />
          {t("common.create", "Create")} {/* Fallback to create if missing */}
        </Button>
      </div>

      <Card className="flex flex-1 flex-col items-center justify-center border-border/50 border-dashed bg-background/50 shadow-none">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-foreground/10">
            <WorkflowIcon className="size-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">{t("workflow.empty", "No workflows configured yet")}</p>
        </div>
      </Card>
    </div>
  )
}
