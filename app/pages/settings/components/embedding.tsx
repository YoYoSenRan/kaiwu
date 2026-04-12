import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EmbeddingConfig, ModelInfo } from "../../../../electron/features/embedding/types"

/** Embedding 引擎配置卡片：本地模型下载 + 远程 API 配置。 */
export function EmbeddingCard() {
  const { t } = useTranslation()

  const [config, setConfig] = useState<EmbeddingConfig>({
    provider: "local",
    localModel: "",
    remote: { endpoint: "", apiKey: "", model: "" },
  })
  const [models, setModels] = useState<ModelInfo[]>([])
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const loadData = useCallback(async () => {
    const [cfg, mdls] = await Promise.all([
      window.electron.embedding.getConfig(),
      window.electron.embedding.listModels(),
    ])
    setConfig(cfg)
    setModels(mdls)
  }, [])

  useEffect(() => {
    loadData()
    // 订阅下载进度，组件卸载时自动取消
    const unsub = window.electron.embedding.onProgress((info) => {
      setDownloading(true)
      setDownloadProgress(info.progress)
      if (info.progress >= 100) {
        setDownloading(false)
        loadData()
      }
    })
    return unsub
  }, [loadData])

  const handleSave = useCallback(async () => {
    await window.electron.embedding.setConfig(config)
    await loadData()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [config, loadData])

  const handleDownload = useCallback(async () => {
    if (!config.localModel) return
    setDownloading(true)
    setDownloadProgress(0)
    await window.electron.embedding.download(config.localModel)
  }, [config.localModel])

  const handleTest = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // 传入当前表单配置，测试前会自动保存并切换引擎
      const result = await window.electron.embedding.test(config)
      if (result.ok) {
        setTestResult(t("settings.embedding.testOk", { dimensions: result.dimensions, model: result.model }))
      } else if (result.error === "MODEL_NOT_DOWNLOADED") {
        setTestResult(t("settings.embedding.testFail", { error: t("settings.embedding.statusNotCached") }))
      } else {
        setTestResult(t("settings.embedding.testFail", { error: result.error }))
      }
    } finally {
      setTesting(false)
    }
  }, [t, config])

  const selectedModel = models.find((m) => m.id === config.localModel)

  return (
    <div className="space-y-6">
      {/* 引擎类型选择 */}
        <div className="flex items-center justify-between">
          <Label>{t("settings.embedding.providerLabel")}</Label>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={config.provider === "local" ? "default" : "outline"}
              onClick={() => setConfig((c) => ({ ...c, provider: "local" }))}
            >
              {t("settings.embedding.providerLocal")}
            </Button>
            <Button
              size="sm"
              variant={config.provider === "remote" ? "default" : "outline"}
              onClick={() => setConfig((c) => ({ ...c, provider: "remote" }))}
            >
              {t("settings.embedding.providerRemote")}
            </Button>
          </div>
        </div>

        <Separator />

        {/* 本地模式 */}
        {config.provider === "local" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("settings.embedding.modelLabel")}</Label>
              {selectedModel && (
                <Badge variant={selectedModel.cached ? "default" : "secondary"}>
                  {selectedModel.cached
                    ? t("settings.embedding.statusCached")
                    : t("settings.embedding.statusNotCached")}
                </Badge>
              )}
            </div>
            <Select value={config.localModel} onValueChange={(v) => setConfig((c) => ({ ...c, localModel: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} · {m.size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {downloading && (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">{t("settings.embedding.statusDownloading")}</p>
                <Progress value={downloadProgress} />
              </div>
            )}
            {!selectedModel?.cached && (
              <Button size="sm" disabled={downloading || !config.localModel} onClick={handleDownload}>
                {t("settings.embedding.download")}
              </Button>
            )}
          </div>
        )}

        {/* 远程模式 */}
        {config.provider === "remote" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("settings.embedding.endpointLabel")}</Label>
              <Input
                value={config.remote.endpoint}
                onChange={(e) => setConfig((c) => ({ ...c, remote: { ...c.remote, endpoint: e.target.value } }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.embedding.apiKeyLabel")}</Label>
              <Input
                type="password"
                placeholder={t("settings.embedding.apiKeyPlaceholder")}
                value={config.remote.apiKey}
                onChange={(e) => setConfig((c) => ({ ...c, remote: { ...c.remote, apiKey: e.target.value } }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.embedding.remoteModelLabel")}</Label>
              <Input
                placeholder={t("settings.embedding.remoteModelPlaceholder")}
                value={config.remote.model}
                onChange={(e) => setConfig((c) => ({ ...c, remote: { ...c.remote, model: e.target.value } }))}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* 测试 + 保存 */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={testing} onClick={handleTest}>
            {testing ? t("settings.embedding.testing") : t("settings.embedding.test")}
          </Button>
          <Button size="sm" disabled={saved} onClick={handleSave}>
            {saved ? t("settings.embedding.saved") : t("settings.embedding.save")}
          </Button>
          {testResult && <p className="text-muted-foreground text-xs">{testResult}</p>}
        </div>
    </div>
  )
}
