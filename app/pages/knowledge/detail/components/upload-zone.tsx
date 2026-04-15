import { Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

interface Props {
  kbId: string
  onUploaded: () => void
}

/** 文档上传按钮。点击触发主进程原生文件对话框。 */
export function UploadZone({ kbId, onUploaded }: Props) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    setUploading(true)
    try {
      const docs = await window.electron.knowledge.doc.upload(kbId)
      if (docs.length > 0) onUploaded()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Button size="sm" onClick={handleUpload} disabled={uploading}>
      <Upload className="mr-1.5 size-4" />
      {t("knowledge.upload")}
    </Button>
  )
}
