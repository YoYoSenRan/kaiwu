import { useTranslation } from "react-i18next"
import { Brain } from "lucide-react"
import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"

const plugins = { code }

interface ThinkingBlockProps {
  content: string
}

/**
 * 可折叠的推理过程块。默认收起，点击展开查看 agent 的思考过程。
 * @param content thinking 文本
 */
export function ThinkingBlock({ content }: ThinkingBlockProps) {
  const { t } = useTranslation()

  if (!content) return null

  return (
    <details className="border-border/50 bg-muted/20 my-1.5 rounded-lg border">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs select-none">
        <Brain className="text-muted-foreground size-3 shrink-0" />
        <span className="text-muted-foreground font-medium">{t("chat.thinking")}</span>
      </summary>
      <div className="border-border/50 text-muted-foreground/80 border-t px-2.5 py-2 text-sm italic">
        <Streamdown plugins={plugins}>{content}</Streamdown>
      </div>
    </details>
  )
}
