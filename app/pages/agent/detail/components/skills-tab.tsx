import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Wrench, Zap, Shield, Database, Globe, Code } from "lucide-react"
import type { AgentDetail } from "@contracts/agent"

interface Props {
  detail: AgentDetail
}

function getSkillIcon(name: string) {
  const key = name.toLowerCase()
  if (key.includes("web") || key.includes("http") || key.includes("url")) return Globe
  if (key.includes("db") || key.includes("sql") || key.includes("data")) return Database
  if (key.includes("sec") || key.includes("auth") || key.includes("protect")) return Shield
  if (key.includes("code") || key.includes("dev") || key.includes("program")) return Code
  if (key.includes("fast") || key.includes("speed") || key.includes("perf")) return Zap
  return Wrench
}

export function SkillsTab({ detail }: Props) {
  const { t } = useTranslation()
  const skills = detail.skills?.skills ?? []

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Wrench className="text-muted-foreground size-6" />
        </div>
        <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => {
        const Icon = getSkillIcon(skill.name)
        return (
          <Card key={skill.name}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                    <Icon className="text-primary size-5" />
                  </div>
                  <div>
                    <p className="font-medium">{skill.name}</p>
                    {skill.reasons && skill.reasons.length > 0 && (
                      <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                        {skill.reasons.map((r, i) => (
                          <li key={i}>· {r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <Switch checked={skill.enabled} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
