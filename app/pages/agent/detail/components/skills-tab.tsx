import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AgentDetail } from "@contracts/agent"

interface Props {
  detail: AgentDetail
}

export function SkillsTab({ detail }: Props) {
  const { t } = useTranslation()
  const skills = detail.skills?.skills ?? []

  if (skills.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground py-10 text-center text-sm">{t("common.noData")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("agent.skills.name")}</TableHead>
              <TableHead>{t("agent.skills.enabled")}</TableHead>
              <TableHead>{t("agent.skills.reasons")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skills.map((s) => (
              <TableRow key={s.name}>
                <TableCell>
                  <span className="font-medium">{s.name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={s.enabled ? "default" : "secondary"}>
                    {s.enabled ? t("agent.skills.on") : t("agent.skills.off")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {s.reasons && s.reasons.length > 0 ? (
                    <ul className="text-muted-foreground space-y-0.5 text-xs">
                      {s.reasons.map((r, i) => (
                        <li key={i}>· {r}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
