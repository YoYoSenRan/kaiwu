"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MobileNav } from "./MobileNav"
import { UserMenu } from "./UserMenu"

const NAV_ITEMS = [
  { label: "造物志", href: "/stories" },
  { label: "局中人", href: "/agents" },
  { label: "物帖墙", href: "/trends" },
  { label: "造物坊", href: "/pipeline" },
  { label: "内坊", href: "/behind" },
] as const

interface NavbarProps {
  user: { username: string; avatarUrl?: string | null } | null
  loginUrl: string
}

export function Navbar({ user, loginUrl }: NavbarProps): React.ReactElement {
  const pathname = usePathname()

  return (
    <header className={cn("sticky top-0 z-50 h-16", "border-b border-border/50", "backdrop-blur-lg")} style={{ background: "rgba(10, 10, 15, 0.8)" }}>
      <nav className="mx-auto max-w-7xl h-full px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display text-xl font-700 tracking-[0.1em] text-foreground hover:text-cinnabar t-fast">
          开物局
        </Link>

        {/* 桌面导航 */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("text-sm font-500 t-fast", isActive ? "text-foreground border-b-2 border-cinnabar pb-0.5" : "text-muted-fg hover:text-foreground")}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* 右侧区域 */}
        <div className="flex items-center gap-4">
          {/* 更鼓指示器 */}
          <div className="flex items-center gap-2 text-muted-fg">
            <span className="w-2 h-2 rounded-full bg-kiln" style={{ animation: "drum-pulse 2s ease-in-out infinite" }} aria-hidden="true" />
            <span className="font-mono text-xs hidden sm:inline">12:47</span>
          </div>

          {/* 登录区 */}
          <div className="hidden md:block">
            <UserMenu user={user} loginUrl={loginUrl} />
          </div>

          {/* 移动端汉堡 */}
          <MobileNav items={NAV_ITEMS} pathname={pathname} />
        </div>
      </nav>
    </header>
  )
}
