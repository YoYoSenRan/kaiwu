import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, ListChecks, MessagesSquare, Library } from "lucide-react"

/** 仪表台：首页总览。当前为空态，后续接入真实指标。 */
export default function Dashboard() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bot} title={t("dashboard.stats.agents")} />
        <StatCard icon={ListChecks} title={t("dashboard.stats.tasks")} />
        <StatCard icon={MessagesSquare} title={t("dashboard.stats.chats")} />
        <StatCard icon={Library} title={t("dashboard.stats.knowledge")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.activityTitle")}</CardTitle>
          <CardDescription>{t("dashboard.activityEmpty")}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("common.noData")}</CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
}

/** Dashboard 顶部的 4 列统计卡片空态，后续接入时替换为真实数值。 */
function StatCard({ icon: Icon, title }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">—</div>
        <p className="text-xs text-muted-foreground">—</p>
      </CardContent>
    </Card>
  )
}
