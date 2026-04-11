import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { errorCodeToKey } from "../../data"
import type { AgentRow, ModelChoice } from "@/types/agent"

interface Props {
  row: AgentRow
  onChanged: () => void
}

/** 概览 Tab：展示并编辑 name / model / emoji，model 下拉通过 openclaw.models.list 拉取。 */
export function OverviewTab({ row, onChanged }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(row.name)
  const [emoji, setEmoji] = useState(row.emoji ?? "")
  const [model, setModel] = useState(row.model ?? "")
  const [models, setModels] = useState<ModelChoice[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(row.name)
    setEmoji(row.emoji ?? "")
    setModel(row.model ?? "")
  }, [row.id, row.name, row.emoji, row.model])

  useEffect(() => {
    window.electron.openclaw.models
      .list()
      .then((r) => setModels(r.models))
      .catch(() => setModels([]))
  }, [])

  const dirty = name !== row.name || emoji !== (row.emoji ?? "") || model !== (row.model ?? "")

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      await window.electron.agent.update({
        id: row.id,
        name: name !== row.name ? name : undefined,
        emoji: emoji !== (row.emoji ?? "") ? emoji : undefined,
        model: model !== (row.model ?? "") ? model : undefined,
      })
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      {error && <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">{t(`agent.error.${errorCodeToKey(error)}`, { message: error })}</div>}

      <Readonly label={t("agent.overview.idLabel")} value={row.agent} mono />
      <Readonly label={t("agent.overview.workspaceLabel")} value={row.workspace} mono breakAll />

      <div className="space-y-1.5">
        <Label className="text-xs">{t("agent.form.name")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t("agent.form.emoji")}</Label>
        <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-20" disabled={saving} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t("agent.overview.modelLabel")}</Label>
        <Select value={model || "__default__"} onValueChange={(v) => setModel(v === "__default__" ? "" : v)} disabled={saving}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">{t("agent.overview.modelDefault")}</SelectItem>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name ?? m.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? t("agent.overview.saving") : t("agent.overview.save")}
        </Button>
      </div>
    </div>
  )
}

function Readonly({ label, value, mono, breakAll }: { label: string; value: string; mono?: boolean; breakAll?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className={`bg-muted rounded-md px-3 py-2 text-xs ${mono ? "font-mono" : ""} ${breakAll ? "break-all" : ""}`}>{value}</div>
    </div>
  )
}
