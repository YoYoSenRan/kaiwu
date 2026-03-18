import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * 宣纸卡片 — 开物局东方视觉基础组件
 *
 * 双线边框 + 纸纹质感 + 左上折角，模拟手工纸张的温度。
 * hover 时微微浮起，暗示可交互。
 *
 * @description 仅用于物帖卡片、造物志容器等需要"纸张感"的场景。
 * 普通卡片不要用此组件（东方元素单页不超过 3 处点缀）。
 *
 * @example
 * ```tsx
 * <PaperCard>
 *   <h3>极简记账</h3>
 *   <p>记账不该这么复杂。</p>
 * </PaperCard>
 * ```
 */
export function PaperCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.ReactElement {
  return (
    <div
      className={cn(
        "paper-texture relative",
        "rounded-[var(--radius-md)] p-6",
        "bg-card text-card-fg",
        "border-double border-3 border-border",
        "shadow-[var(--shadow)]",
        "hover:shadow-[var(--shadow-lg)] hover:translate-y--0.5",
        "t-base",
        className,
      )}
    >
      {/* 左上折角 */}
      <div
        className="absolute top-0 left-0 w-0 h-0 border-solid border-t-6 border-l-6 border-r-6 border-b-6 border-t-border border-l-border border-r-transparent border-b-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  )
}
