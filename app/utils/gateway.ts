import type { GatewayStatus } from "@/stores/gateway"

/**
 * gateway 状态点 Tailwind 颜色映射。
 * sidebar footer 和全局状态条 footer 共用，保持两处视觉一致。
 * @param status gateway 当前连接状态
 */
export function gatewayDotColor(status: GatewayStatus): string {
  if (status === "connected") return "bg-primary"
  if (status === "auth-error" || status === "error") return "bg-destructive"
  if (status === "connecting" || status === "detecting") return "bg-muted-foreground animate-pulse"
  return "bg-muted-foreground/40"
}

/**
 * StatusBanner 背景边框类映射。
 */
export function gatewayBannerClass(status: GatewayStatus): string {
  if (status === "connected") return "bg-primary/10 border-primary/20"
  if (status === "auth-error" || status === "error") return "bg-destructive/10 border-destructive/20"
  return "bg-muted border-border"
}

/**
 * StatusBanner 圆点颜色类映射。
 */
export function gatewayDotClass(status: GatewayStatus): string {
  if (status === "connected") return "bg-primary"
  if (status === "auth-error" || status === "error") return "bg-destructive"
  return "bg-muted-foreground"
}
