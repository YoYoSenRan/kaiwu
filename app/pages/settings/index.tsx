import { Bug, Info, Palette } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Separator } from "@/components/ui/separator"
import { AboutCard } from "./components/about"
import { AppearanceCard } from "./components/appearance"
import { DebugCard } from "./components/debug"

/** 设置模块定义。 */
const MODULES = [
  { key: "appearance", icon: Palette, labelKey: "settings.appearanceTitle", descKey: "settings.appearanceDescription" },
  { key: "debug", icon: Bug, labelKey: "settings.debugTitle", descKey: "settings.debugDescription" },
  { key: "about", icon: Info, labelKey: "settings.aboutTitle", descKey: "" },
] as const

type ModuleKey = (typeof MODULES)[number]["key"]

/** 设置页：左侧导航 + 右侧内容区。 */
export default function Settings() {
  const { t } = useTranslation()
  const [active, setActive] = useState<ModuleKey>("appearance")
  const current = MODULES.find((m) => m.key === active)!

  return (
    <div className="flex h-full overflow-hidden">
      {/* 左侧导航 */}
      <nav className="flex w-48 shrink-0 flex-col border-r pr-4">
        <h2 className="text-muted-foreground mb-3 px-3 text-xs font-medium tracking-wider uppercase">{t("settings.title")}</h2>
        <div className="flex flex-col gap-0.5">
          {MODULES.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              type="button"
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${active === key ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
              onClick={() => setActive(key)}
            >
              <Icon className="size-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </nav>

      {/* 右侧内容 */}
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-2 pl-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">{t(current.labelKey)}</h1>
          {current.descKey && <p className="text-muted-foreground mt-1 text-sm">{t(current.descKey)}</p>}
        </div>
        <div className="mb-6">
          <Separator />
        </div>
        {active === "appearance" && <AppearanceCard />}
        {active === "debug" && <DebugCard />}
        {active === "about" && <AboutCard />}
      </div>
    </div>
  )
}
