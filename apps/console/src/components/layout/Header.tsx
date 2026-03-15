"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGateway } from "@/hooks/useGateway"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "./ThemeToggle"
import { MobileNav } from "./MobileNav"
import { ROUTE_LABELS } from "./constants"

export function Header() {
  const { status: gatewayStatus } = useGateway()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()

  const breadcrumbLabel = ROUTE_LABELS[pathname] ?? pathname.split("/").pop() ?? ""

  return (
    <>
      <header className={cn("sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background px-4", "md:px-6")}>
        {/* 移动端汉堡按钮 */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
          <Menu className="size-5" />
          <span className="sr-only">打开菜单</span>
        </Button>

        {/* 面包屑 */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Kaiwu</span>
          {breadcrumbLabel && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-foreground">{breadcrumbLabel}</span>
            </>
          )}
        </div>

        {/* 弹性空间 */}
        <div className="flex-1" />

        {/* Gateway 状态指示灯 */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2 rounded-full",
              gatewayStatus === "connected" && "bg-green-500 shadow-green-500/50 shadow-sm",
              gatewayStatus === "disconnected" && "bg-red-500",
              gatewayStatus === "connecting" && "bg-yellow-500 animate-pulse",
              gatewayStatus === "reconnecting" && "bg-yellow-500 animate-pulse"
            )}
          />
          <span className="hidden text-xs text-muted-foreground sm:inline">Gateway</span>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* 主题切换 */}
        <ThemeToggle />

        {/* 用户头像 */}
        <Avatar size="sm">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </header>

      {/* 移动端导航抽屉 */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  )
}
