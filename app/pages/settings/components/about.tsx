import { useTranslation } from "react-i18next"

/** 关于信息：版本号、构建号、设备 ID、环境。 */
export function AboutCard() {
  const { t } = useTranslation()
  return (
    <dl className="grid grid-cols-[120px_1fr] gap-y-4 text-sm">
      <dt className="text-muted-foreground">{t("settings.versionLabel")}</dt>
      <dd className="font-mono">v0.1.0</dd>
      <dt className="text-muted-foreground">{t("settings.buildLabel")}</dt>
      <dd className="font-mono">2025.0412.1</dd>
      <dt className="text-muted-foreground">{t("settings.deviceId")}</dt>
      <dd className="font-mono">dev-1a2b3c</dd>
      <dt className="text-muted-foreground">{t("settings.envLabel")}</dt>
      <dd className="font-mono">DEV</dd>
    </dl>
  )
}
