import { cn } from "@/lib/utils"

/**
 * 墨晕背景 — 开物局东方视觉基础组件
 *
 * 纯 CSS 渐变模拟水墨散开效果，不使用图片。
 *
 * @description 每页最多 1-2 处使用。Hero 区和章节过渡是典型场景。
 *
 * @example
 * ```tsx
 * <InkWash variant="hero" className="min-h-[60vh]">
 *   <h1>开物局</h1>
 * </InkWash>
 *
 * <InkWash variant="section" />
 * ```
 */
export function InkWash({
  variant = "hero",
  children,
  className,
}: {
  variant?: "hero" | "section"
  children?: React.ReactNode
  className?: string
}): React.ReactElement {
  if (variant === "section") {
    return (
      <div
        className={cn("h-30 w-full opacity-30", className)}
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--muted) 50%, transparent)",
        }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div
      className={cn("relative w-full", className)}
      style={{
        background: [
          "radial-gradient(ellipse 600px 400px at 30% 20%, rgba(26,26,37,0.6), transparent)",
          "radial-gradient(ellipse 400px 600px at 70% 80%, rgba(26,26,37,0.4), transparent)",
          "var(--background)",
        ].join(", "),
      }}
    >
      {children}
    </div>
  )
}
