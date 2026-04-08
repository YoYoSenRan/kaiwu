import { useTranslation } from "react-i18next"

/** 任务页面占位，后续替换为真实实现。 */
export default function Task() {
  const { t } = useTranslation()
  return (
    <div className="px-10 pt-10">
      <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">{t("task.label")}</p>
      <h1 className="mt-4 text-[120px] leading-[0.85] font-extralight tracking-[-0.05em]">{t("task.title")}</h1>
      <p className="mt-8 max-w-md text-sm text-muted-foreground">{t("task.description")}</p>
    </div>
  )
}
