import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { errorCodeToKey } from "../../data"
import type { AgentRow, ModelChoice } from "@/types/agent"
import { MessageSquare, Copy, Check } from "lucide-react"

interface Props {
  row: AgentRow
  onChanged: () => void
}

/** 概览 Tab：左栏展示元数据 + 快捷操作，右栏编辑 name / model / emoji。 */
export function OverviewTab({ row, onChanged }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState(row.name)
  const [emoji, setEmoji] = useState(row.emoji ?? "")
  const [model, setModel] = useState(row.model ?? "")
  const [models, setModels] = useState<ModelChoice[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  const copyId = async () => {
    await navigator.clipboard.writeText(row.agent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const startChat = () => navigate(`/chat?agentId=${row.agent}`)

  const formatTime = (ms: number | null) => {
    if (!ms) return t("agent.overview.never")
    const d = new Date(ms)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <div className="space-y-4 text-sm">
      {error && <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">{t(`agent.error.${errorCodeToKey(error)}`, { message: error })}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* 左栏 — 信息卡片 + 快捷操作 */}
        <div className="space-y-4">
          <div className="border-border rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">{t("agent.overview.metaTitle")}</h4>
            <div className="space-y-2">
              <Meta label={t("agent.overview.idLabel")} value={row.agent} mono>
                <Button variant="ghost" size="icon" className="size-5" onClick={copyId}>
                  {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </Button>
              </Meta>
              <Meta label={t("agent.overview.workspaceLabel")} value={row.workspace} mono breakAll />
              <Meta label={t("agent.overview.modelLabel")} value={row.model ?? t("agent.overview.modelDefault")} />
              <Meta label={t("agent.overview.syncedLabel")} value={formatTime(row.last_synced_at)} />
              <Meta label={t("agent.overview.createdLabel")} value={formatTime(row.created_at)} />
            </div>
          </div>

          <div className="border-border flex flex-col gap-2 rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">{t("agent.overview.actionsTitle")}</h4>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={startChat}>
              <MessageSquare className="size-4" />
              {t("agent.overview.startChat")}
            </Button>
          </div>
        </div>

        {/* 右栏 — 编辑表单 */}
        <div className="border-border rounded-lg border p-4">
          <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">{t("agent.overview.editTitle")}</h4>
          <div className="space-y-3">
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
                  <SelectValue placeholder={t("agent.overview.modelDefault")}>
                    {model ? (models.find((m) => m.id === model)?.name ?? model) : t("agent.overview.modelDefault")}
                  </SelectValue>
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

            <div className="flex justify-end pt-1">
              <Button onClick={save} disabled={!dirty || saving}>
                {saving ? t("agent.overview.saving") : t("agent.overview.save")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value, mono, breakAll, children }: { label: string; value: string; mono?: boolean; breakAll?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <div className={`flex items-center gap-1 text-right text-xs ${mono ? "font-mono" : ""} ${breakAll ? "break-all" : ""}`}>
        {value}
        {children}
      </div>
    </div>
  )
}
