/** 消息之间的时间分割线:相邻消息跨 1h 或跨日时插入。 */

function formatDivider(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (d.toDateString() === now.toDateString()) return hm
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `昨天 ${hm}`
  const sameYear = d.getFullYear() === now.getFullYear()
  const datePart = d.toLocaleDateString([], sameYear ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" })
  return `${datePart} ${hm}`
}

export function TimeDivider({ ts }: { ts: number }) {
  return (
    <div className="my-2 flex items-center gap-3">
      <div className="border-border/40 flex-1 border-t" />
      <span className="text-muted-foreground text-[11px]">{formatDivider(ts)}</span>
      <div className="border-border/40 flex-1 border-t" />
    </div>
  )
}
