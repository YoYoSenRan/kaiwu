"use client"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "./SidebarNav"
import { NAV_ITEMS } from "./constants"

interface SidebarProps {
  gatewayStatus?: "connected" | "disconnected" | "reconnecting"
}

export function Sidebar({ gatewayStatus = "disconnected" }: SidebarProps) {
  return (
    <aside className={cn("hidden flex-col border-r border-sidebar-border bg-sidebar md:flex", "md:w-16 lg:w-64")}>
      {/* Logo / 项目名 */}
      <div className="flex h-14 items-center px-4 lg:px-6">
        <span className="text-lg font-bold text-sidebar-foreground lg:block md:hidden">Kaiwu</span>
        <span className="text-lg font-bold text-sidebar-foreground lg:hidden md:block">K</span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* 导航列表 */}
      <div className="flex flex-1 flex-col overflow-y-auto py-2">
        {/* 平板：collapsed 模式 */}
        <div className="lg:hidden md:block hidden">
          <SidebarNav groups={NAV_ITEMS} collapsed />
        </div>
        {/* 桌面：完整模式 */}
        <div className="hidden lg:block">
          <SidebarNav groups={NAV_ITEMS} />
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Gateway 状态指示灯 */}
      <div className="flex items-center gap-2 px-4 py-3 lg:px-6">
        <span
          className={cn(
            "size-2 rounded-full",
            gatewayStatus === "connected" && "bg-green-500",
            gatewayStatus === "disconnected" && "bg-red-500",
            gatewayStatus === "reconnecting" && "bg-yellow-500"
          )}
        />
        <span className="hidden text-xs text-sidebar-foreground/70 lg:inline">Gateway</span>
      </div>
    </aside>
  )
}
