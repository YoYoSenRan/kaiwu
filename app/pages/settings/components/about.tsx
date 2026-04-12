import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** 关于卡片：版本号、构建号、设备 ID 展示。 */
export function AboutCard() {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.aboutTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
          <dt className="text-muted-foreground">{t("settings.versionLabel")}</dt>
          <dd className="font-mono">v0.1.0</dd>
          <dt className="text-muted-foreground">{t("settings.buildLabel")}</dt>
          <dd className="font-mono">2025.0412.1</dd>
          <dt className="text-muted-foreground">{t("settings.deviceId")}</dt>
          <dd className="font-mono">dev-1a2b3c</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
