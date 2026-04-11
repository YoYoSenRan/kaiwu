import { Library, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/** 知识库页：空态 + 上传入口。后续接入索引和文档列表。 */
export default function Knowledge() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("knowledge.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("knowledge.description")}</p>
        </div>
        <Button>
          <Upload className="mr-1.5 size-4" />
          {t("knowledge.upload")}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <Library className="text-muted-foreground size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("knowledge.emptyTitle")}</p>
            <p className="text-muted-foreground text-xs">{t("knowledge.emptyDescription")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
