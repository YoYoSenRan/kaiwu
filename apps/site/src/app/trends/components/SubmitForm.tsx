"use client"

import { useActionState } from "react"
import { submitKeyword } from "../actions"
import { cn } from "@/lib/utils"

export function SubmitForm({ isLoggedIn, loginUrl }: { isLoggedIn: boolean; loginUrl: string }): React.ReactElement {
  const [state, action, pending] = useActionState(submitKeyword, {})

  if (!isLoggedIn) {
    return (
      <div className="rounded-[var(--radius-md)] border border-border bg-card p-6 text-center">
        <p className="text-muted-fg mb-3">登录后提交你的物帖</p>
        <a href={loginUrl} className={cn("inline-block px-4 py-2 text-sm font-500", "border border-border rounded-[var(--radius)]", "text-foreground hover:bg-muted t-fast")}>
          GitHub 登录
        </a>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-[var(--radius-md)] border border-border bg-card p-6">
      <h3 className="font-display text-lg font-700 mb-4">投一张物帖</h3>

      <div className="mb-3">
        <input
          name="text"
          type="text"
          placeholder="关键词（1-20 字）"
          maxLength={20}
          required
          className={cn(
            "w-full px-3 py-2 text-sm",
            "bg-background border border-border rounded-[var(--radius)]",
            "text-foreground placeholder:text-muted-fg",
            "outline-none focus:border-cinnabar"
          )}
        />
      </div>

      <div className="mb-4">
        <textarea
          name="reason"
          placeholder="为什么觉得值得做？（20-200 字）"
          minLength={20}
          maxLength={200}
          required
          rows={3}
          className={cn(
            "w-full px-3 py-2 text-sm resize-none",
            "bg-background border border-border rounded-[var(--radius)]",
            "text-foreground placeholder:text-muted-fg",
            "outline-none focus:border-cinnabar"
          )}
        />
      </div>

      {state.error && <p className="text-sm text-crimson mb-3">{state.error}</p>}
      {state.success && <p className="text-sm text-celadon mb-3">物帖已提交！</p>}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "px-6 py-2 text-sm font-500 text-white rounded-[var(--radius)]",
          "bg-cinnabar hover:bg-cinnabar-light active:bg-cinnabar-dark",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "t-fast"
        )}
      >
        {pending ? "提交中..." : "提交物帖"}
      </button>
    </form>
  )
}
