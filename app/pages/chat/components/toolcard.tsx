import { useTranslation } from "react-i18next"
import { Wrench, AlertTriangle } from "lucide-react"

/** 工具输出内联显示的最大字符数。超过则折叠。 */
const INLINE_THRESHOLD = 80

interface ToolCardProps {
  kind: "call" | "result"
  name: string
  detail: string
  isError?: boolean
}

/**
 * 工具调用/结果卡片。短输出内联，长输出折叠预览。
 * @param kind "call" = 工具调用（显示参数），"result" = 工具结果（显示输出）
 * @param name 工具名称
 * @param detail 参数 JSON 或输出文本
 * @param isError 是否为错误结果
 */
export function ToolCard({ kind, name, detail, isError }: ToolCardProps) {
  const { t } = useTranslation()
  const isShort = detail.length <= INLINE_THRESHOLD
  const label = kind === "call" ? name || t("chat.tool.call") : name || t("chat.tool.result")
  const Icon = isError ? AlertTriangle : Wrench

  return (
    <details className="border-border/50 bg-muted/30 my-1.5 rounded-lg border text-xs">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 select-none">
        <Icon className={`size-3 shrink-0 ${isError ? "text-destructive" : "text-muted-foreground"}`} />
        <span className="font-medium">{label}</span>
        {isShort && detail && <span className="text-muted-foreground/70 ml-auto max-w-[200px] truncate">{detail}</span>}
      </summary>
      {!isShort && (
        <pre className="border-border/50 text-muted-foreground overflow-x-auto border-t px-2.5 py-2 text-[11px] leading-relaxed break-all whitespace-pre-wrap">{detail}</pre>
      )}
    </details>
  )
}
