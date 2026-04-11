import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FolderOpen, Link as LinkIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EDITABLE_BOOTSTRAP_FILES, errorCodeToKey } from "../data"
import type { AgentCreateInput, AvatarInput } from "@/types/agent"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

type AvatarTab = "file" | "url"

/** 新建 agent 的表单 Dialog。提交后调 agent.create，成功后通知父组件刷新。 */
export function CreateAgentDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation()
  const [agentId, setAgentId] = useState("")
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [avatarTab, setAvatarTab] = useState<AvatarTab>("file")
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [files, setFiles] = useState<Record<string, string>>({})
  const [currentFile, setCurrentFile] = useState<string>(EDITABLE_BOOTSTRAP_FILES[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setAgentId("")
    setName("")
    setEmoji("")
    setAvatarTab("file")
    setAvatarPath(null)
    setAvatarUrl("")
    setFiles({})
    setCurrentFile(EDITABLE_BOOTSTRAP_FILES[0])
    setError(null)
  }

  const handleClose = (next: boolean) => {
    if (submitting) return
    if (!next) reset()
    onOpenChange(next)
  }

  const pickAvatar = async () => {
    const path = await window.electron.agent.avatar.pick()
    if (path) setAvatarPath(path)
  }

  const buildAvatarInput = (): AvatarInput | undefined => {
    if (avatarTab === "file" && avatarPath) return { type: "file", path: avatarPath }
    if (avatarTab === "url" && avatarUrl.trim()) return { type: "url", url: avatarUrl.trim() }
    return undefined
  }

  const submit = async () => {
    setError(null)
    if (!agentId.trim()) return setError("idEmpty")
    if (!name.trim()) return setError("nameEmpty")

    const input: AgentCreateInput = {
      agent: agentId.trim(),
      name: name.trim(),
      emoji: emoji.trim() || undefined,
      avatar: buildAvatarInput(),
      files,
    }

    setSubmitting(true)
    try {
      await window.electron.agent.create(input)
      onCreated()
      reset()
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("agent.createAgent")}</DialogTitle>
          <DialogDescription>{t("agent.form.hint")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {error && <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">{t(`agent.error.${errorCodeToKey(error)}`, { message: error })}</div>}

          <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <FormField label={t("agent.form.id")} hint={t("agent.form.idHint")}>
              <Input value={agentId} onChange={(e) => setAgentId(e.target.value.toLowerCase())} placeholder={t("agent.form.idPlaceholder")} disabled={submitting} />
            </FormField>
            <FormField label={t("agent.form.name")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("agent.form.namePlaceholder")} disabled={submitting} />
            </FormField>
          </div>

          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <FormField label={t("agent.form.emoji")}>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder={t("agent.form.emojiPlaceholder")} disabled={submitting} className="w-20 text-center" />
            </FormField>
            <FormField label={t("agent.form.avatar")}>
              <Tabs value={avatarTab} onValueChange={(v) => setAvatarTab(v as AvatarTab)}>
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="file" className="gap-1">
                    <FolderOpen className="size-3.5" />
                    {t("agent.form.avatarFile")}
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-1">
                    <LinkIcon className="size-3.5" />
                    {t("agent.form.avatarUrl")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="file" className="mt-2 flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={pickAvatar} disabled={submitting}>
                    {t("agent.form.avatarPick")}
                  </Button>
                  {avatarPath && <span className="text-muted-foreground truncate font-mono text-xs">{avatarPath}</span>}
                </TabsContent>
                <TabsContent value="url" className="mt-2">
                  <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder={t("agent.form.avatarUrlPlaceholder")} disabled={submitting} className="font-mono text-xs" />
                </TabsContent>
              </Tabs>
            </FormField>
          </div>

          <FormField label={t("agent.form.files")} hint={t("agent.form.filesHint")}>
            <Tabs value={currentFile} onValueChange={setCurrentFile}>
              <TabsList className="grid grid-cols-5">
                {EDITABLE_BOOTSTRAP_FILES.map((f) => (
                  <TabsTrigger key={f} value={f} className="text-[11px]">
                    {f.replace(".md", "")}
                  </TabsTrigger>
                ))}
              </TabsList>
              {EDITABLE_BOOTSTRAP_FILES.map((f) => (
                <TabsContent key={f} value={f} className="mt-2">
                  <Textarea
                    value={files[f] ?? ""}
                    onChange={(e) => setFiles({ ...files, [f]: e.target.value })}
                    placeholder={t("agent.form.filePlaceholder", { file: f })}
                    disabled={submitting}
                    className="min-h-[140px] font-mono text-xs"
                  />
                </TabsContent>
              ))}
            </Tabs>
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            {t("agent.form.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting || !agentId.trim() || !name.trim()}>
            {submitting ? t("agent.form.submitting") : t("agent.form.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 带 label + optional hint 的表单字段包装。 */
function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  )
}
