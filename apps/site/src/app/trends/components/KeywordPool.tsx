import Link from "next/link"
import { cn } from "@/lib/utils"
import { KeywordCard } from "./KeywordCard"
import type { KeywordWithMeta } from "../queries"

const TABS = [
  { label: "全部", value: "" },
  { label: "等待中", value: "pending" },
  { label: "正在造", value: "in_pipeline" },
] as const

export function KeywordPool({
  keywords,
  currentStatus,
  isLoggedIn,
  loginUrl,
}: {
  keywords: KeywordWithMeta[]
  currentStatus: string
  isLoggedIn: boolean
  loginUrl: string
}): React.ReactElement {
  return (
    <div>
      {/* 筛选 Tabs */}
      <div className="flex gap-1 mb-6">
        {TABS.map((tab) => {
          const isActive = currentStatus === tab.value
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/trends?status=${tab.value}` : "/trends"}
              className={cn(
                "px-3 py-1.5 text-sm rounded-[var(--radius)] t-fast",
                isActive ? "bg-cinnabar-ghost text-cinnabar font-500" : "text-muted-fg hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* 物帖列表 */}
      {keywords.length === 0 ? (
        <div className="py-16 text-center text-muted-fg">
          <p>物帖墙上空空如也。</p>
          <p className="text-sm mt-1">等着第一个人投进一张物帖。</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {keywords.map((kw) => (
            <KeywordCard key={kw.id} keyword={kw} isLoggedIn={isLoggedIn} loginUrl={loginUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
