"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { type NavGroup } from "./constants"

interface SidebarNavProps {
  groups: NavGroup[]
  collapsed?: boolean
  onItemClick?: () => void
}

export function SidebarNav({ groups, collapsed = false, onItemClick }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 px-2">
      {groups.map((group) => (
        <div key={group.group} className="mt-4 first:mt-0">
          {!collapsed && <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.group}</p>}
          {group.items.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
