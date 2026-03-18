"use client"

import { useState } from "react"
import Link from "next/link"
import * as Dialog from "@radix-ui/react-dialog"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  readonly label: string
  readonly href: string
}

export function MobileNav({ items, pathname }: { items: readonly NavItem[]; pathname: string }): React.ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="md:hidden p-2 text-foreground hover:text-cinnabar t-fast" aria-label="打开导航菜单">
          <Menu className="w-5 h-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* 遮罩 */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />

        {/* Drawer */}
        <Dialog.Content
          className={cn("fixed top-0 right-0 z-50 h-full", "w-[80vw] max-w-80", "bg-card border-l border-border", "p-6 flex flex-col")}
          style={{ animation: "slide-in-right 300ms ease" }}
        >
          <Dialog.Close asChild>
            <button className="self-end p-2 text-muted-fg hover:text-foreground t-fast" aria-label="关闭导航菜单">
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>

          <nav className="mt-6 flex flex-col gap-1">
            {items.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between",
                    "py-3 px-2 rounded-[var(--radius)] text-base font-500 t-fast",
                    isActive ? "text-foreground bg-muted" : "text-muted-fg hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                  <span className="text-muted-fg text-sm" aria-hidden="true">
                    →
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* 更鼓 */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-fg mb-2">更鼓</p>
            <div className="flex items-center gap-2 text-muted-fg">
              <span className="w-2 h-2 rounded-full bg-kiln" style={{ animation: "drum-pulse 2s ease-in-out infinite" }} aria-hidden="true" />
              <span className="font-mono text-xs">下一声更鼓 · 12:47</span>
            </div>
          </div>

          {/* 登录区 slot */}
          <div className="mt-auto pt-6 border-t border-border" data-slot="auth-mobile" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
