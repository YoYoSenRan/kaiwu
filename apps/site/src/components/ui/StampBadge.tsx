import { cn } from "@/lib/utils"

const SIZE_MAP = { sm: "px-1.5 py-0.5 text-[10px]", md: "px-2 py-1 text-xs", lg: "px-3 py-1.5 text-sm" } as const

/**
 * 印章徽章 — 开物局东方视觉基础组件
 *
 * 朱砂色方章，微偏倾斜，模拟手工盖印的质感。
 *
 * @description 用于盖印投票按钮、Agent 签名、阶段完成标记、掌秤裁决。
 * 东方元素单页不超过 3 处点缀。
 *
 * @example
 * ```tsx
 * <StampBadge size="sm">已开物</StampBadge>
 * <StampBadge size="md">盖印</StampBadge>
 * <StampBadge size="lg">掌秤裁决</StampBadge>
 * ```
 */
export function StampBadge({ children, size = "sm", className }: { children: React.ReactNode; size?: keyof typeof SIZE_MAP; className?: string }): React.ReactElement {
  return (
    <span
      className={cn("inline-block font-display font-700", "text-cinnabar border-2 border-current rounded-sm", "rotate--2", SIZE_MAP[size], className)}
      style={{ clipPath: "polygon(2% 0%, 98% 1%, 100% 3%, 99% 97%, 97% 100%, 3% 99%, 0% 96%, 1% 2%)" }}
    >
      {children}
    </span>
  )
}
