import { cn } from "@/lib/utils"

/**
 * 统一页面标题区 — 东方排版风格
 *
 * 标题使用 font-display（宋体），字间距拉宽 0.12em，营造东方气韵。
 */
export function PageHeader({
  title,
  subtitle,
  bordered = true,
  className,
}: {
  title: string
  subtitle?: string
  bordered?: boolean
  className?: string
}): React.ReactElement {
  return (
    <div
      className={cn(
        "pt-12 pb-10",
        bordered && "border-b border-border",
        className,
      )}
    >
      <h1 className="font-display text-4xl font-700 tracking-[0.12em] text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-base text-muted-fg">{subtitle}</p>
      )}
    </div>
  )
}
