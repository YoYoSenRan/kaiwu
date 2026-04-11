import { MessagesSquare } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/** 对话页：空态。后续接入消息流。 */
export default function Chat() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("chat.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("chat.description")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <MessagesSquare className="text-muted-foreground size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("chat.emptyTitle")}</p>
            <p className="text-muted-foreground text-xs">{t("chat.emptyDescription")}</p>
          </div>
          <Button variant="outline" size="sm">
            {t("chat.startConversation")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
