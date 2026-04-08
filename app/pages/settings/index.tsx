import { useTranslation } from "react-i18next"

/** 设置页面占位，后续替换为真实实现。 */
export default function Settings() {
  const { t } = useTranslation()
  return (
    <div className="px-10 pt-10">
      <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">{t("settings.label")}</p>
      <h1 className="mt-4 text-[120px] leading-[0.85] font-extralight tracking-[-0.05em]">{t("settings.title")}</h1>
      <p className="mt-8 max-w-md text-sm text-muted-foreground">{t("settings.description")}</p>
    </div>
  )
}
