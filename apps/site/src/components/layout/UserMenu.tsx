"use client"

import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { LogOut, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  user: { username: string; avatarUrl?: string | null } | null
  loginUrl: string
}

export function UserMenu({ user, loginUrl }: UserMenuProps): React.ReactElement {
  if (!user) {
    return (
      <a
        href={loginUrl}
        className={cn("text-sm text-muted-fg font-500", "border border-border rounded-[var(--radius)] px-3 py-1.5", "hover:text-foreground hover:bg-muted t-fast")}
      >
        登录
      </a>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-full outline-none focus:ring-2 focus:ring-ring">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-fg">{user.username[0]?.toUpperCase()}</div>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn("z-50 min-w-40 p-1", "bg-card border border-border rounded-[var(--radius)]", "shadow-[var(--shadow-md)]")}
          style={{ animation: "scale-in 200ms ease" }}
          sideOffset={8}
          align="end"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-fg">@{user.username}</DropdownMenu.Label>

          <DropdownMenu.Separator className="h-px my-1 bg-border" />

          <DropdownMenu.Item asChild>
            <a href="/trends" className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground rounded-sm outline-none hover:bg-muted t-fast cursor-pointer">
              <FileText className="w-3.5 h-3.5" />
              我的物帖
            </a>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-fg rounded-sm outline-none hover:bg-muted hover:text-foreground t-fast cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                退出
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
