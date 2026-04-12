import { useTranslation } from "react-i18next"
import { AboutCard } from "./components/about"
import { AppearanceCard } from "./components/appearance"
import { EmbeddingCard } from "./components/embedding"

/** 设置页：外观、Embedding 引擎、关于的配置中心。 */
export default function Settings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("settings.description")}</p>
      </div>

      <AppearanceCard />
      <EmbeddingCard />
      <AboutCard />
    </div>
  )
}
