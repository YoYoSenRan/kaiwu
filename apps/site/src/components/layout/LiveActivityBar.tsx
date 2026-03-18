"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 底部实时活动条 — UI 骨架
 *
 * SSE 数据接入留到后续模块，本阶段用静态示例展示样式。
 */
export function LiveActivityBar(): React.ReactElement {
  const [visible, setVisible] = useState(true)

  if (!visible) return <></>

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
        "max-w-xl w-[calc(100%-2rem)]",
        "bg-card border border-border rounded-[var(--radius-lg)]",
        "shadow-[var(--shadow-lg)]",
        "px-5 py-3",
        "flex items-center justify-between gap-3",
        "text-sm text-foreground",
      )}
      style={{ animation: "slide-up 400ms ease" }}
    >
      <p className="truncate">
        <span className="text-kiln mr-1.5">⚡</span>
        诤臣刚在「AI 写作助手」过堂中说了一句狠话
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-fg text-xs hover:text-foreground t-fast cursor-pointer">
          查看 →
        </span>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-fg hover:text-foreground t-fast p-0.5"
          aria-label="关闭活动提示"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
