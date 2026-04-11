/**
 * gateway 连接状态点的 Tailwind class 映射。
 * 遵循 Operations Deck 单 accent 原则：正常态走灰阶，过渡/异常态走 deck-accent-bg。
 * @param status gateway 当前状态（connected/connecting/detecting/auth-error 等）
 */
export function gatewayStatusDot(status: string): string {
  if (status === "connected") return "bg-foreground/70 deck-pulse"
  if (status === "connecting" || status === "detecting") return "deck-accent-bg deck-pulse"
  if (status === "auth-error") return "deck-accent-bg"
  return "bg-muted-foreground/40"
}
