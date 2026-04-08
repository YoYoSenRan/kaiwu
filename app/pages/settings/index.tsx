import { useTranslation } from "react-i18next"

/** 设置页面占位，后续替换为真实实现。 */
export default function Settings() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-[120px] leading-[0.85] font-extralight tracking-[-0.05em]">{t("settings.title")}</h1>
      <p className="mt-8 max-w-md text-sm text-muted-foreground">{t("settings.description")}</p>
    </div>
  )
}
