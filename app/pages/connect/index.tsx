import { useTranslation } from "react-i18next"

/** 连接页面占位，后续替换为真实实现。 */
export default function Connect() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-[120px] leading-[0.85] font-extralight tracking-[-0.05em]">{t("connect.title")}</h1>
      <p className="mt-8 max-w-md text-sm text-muted-foreground">{t("connect.description")}</p>
    </div>
  )
}
