import { useState } from "react"
import { Library, Upload, List, Share2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { KnowledgeGraph } from "./components/graph-view"

type ViewMode = "list" | "graph"

/** 知识库页：列表视图 + 脑图关系网络视图切换。 */
export default function Knowledge() {
  const { t } = useTranslation()
  const [view, setView] = useState<ViewMode>("graph")

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("knowledge.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("knowledge.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex items-center rounded-lg p-1">
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setView("list")}>
              <List className="size-3.5" />
              列表
            </Button>
            <Button variant={view === "graph" ? "secondary" : "ghost"} size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setView("graph")}>
              <Share2 className="size-3.5" />
              图谱
            </Button>
          </div>
          <Button size="sm">
            <Upload className="mr-1.5 size-4" />
            {t("knowledge.upload")}
          </Button>
        </div>
      </div>

      {view === "list" ? (
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
      ) : (
        <KnowledgeGraph />
      )}
    </div>
  )
}
