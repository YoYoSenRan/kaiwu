import { cn } from "@/lib/utils"

/**
 * 印章图标容器 — 开物局东方视觉基础组件
 *
 * 正方形朱砂边框容器，微偏旋转，用于包裹文字或 emoji。
 *
 * @description 用于阶段完成标记、签名等需要"印章框"的场景。
 *
 * @example
 * ```tsx
 * <SealIcon>印</SealIcon>
 * <SealIcon rotate={3}>成</SealIcon>
 * ```
 */
export function SealIcon({
  children,
  rotate = -2,
  className,
}: {
  children: React.ReactNode
  rotate?: number
  className?: string
}): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "w-6 h-6 text-xs font-display font-700",
        "text-cinnabar border-2 border-cinnabar rounded-sm",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}
