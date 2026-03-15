"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "./SidebarNav"
import { NAV_ITEMS } from "./constants"

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetHeader className="px-6 pt-4">
          <SheetTitle className="text-lg font-bold text-sidebar-foreground">Kaiwu</SheetTitle>
        </SheetHeader>

        <Separator className="bg-sidebar-border" />

        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav groups={NAV_ITEMS} onItemClick={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
