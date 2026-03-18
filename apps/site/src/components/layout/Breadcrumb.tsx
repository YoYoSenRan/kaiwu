import Link from "next/link"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * 面包屑导航 — 二级页面使用
 */
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }): React.ReactElement {
  return (
    <nav className={cn("mb-3 text-[13px] text-muted-fg", className)} aria-label="面包屑">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={item.label}>
            {i > 0 && (
              <span className="mx-1.5" aria-hidden="true">
                /
              </span>
            )}
            {isLast || !item.href ? (
              <span className={cn(isLast && "text-foreground font-500")}>{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
