"use client"

import { useActionState, useOptimistic } from "react"
import { castVote } from "../actions"
import { cn } from "@/lib/utils"

interface VoteButtonProps {
  keywordId: string
  sealVotes: number
  blankVotes: number
  currentStance: "seal" | "blank" | null
  isLoggedIn: boolean
  loginUrl: string
}

export function VoteButton({ keywordId, sealVotes, blankVotes, currentStance, isLoggedIn, loginUrl }: VoteButtonProps): React.ReactElement {
  const [optimisticStance, setOptimisticStance] = useOptimistic(currentStance)
  const [optimisticSeal, setOptimisticSeal] = useOptimistic(sealVotes)
  const [optimisticBlank, setOptimisticBlank] = useOptimistic(blankVotes)

  const [, action] = useActionState(async (_prev: { error?: string; success?: boolean }, formData: FormData) => {
    const stance = formData.get("stance") as "seal" | "blank"

    // 乐观更新
    if (optimisticStance === stance) return { error: "已投" }

    if (optimisticStance) {
      // 改票
      if (stance === "seal") {
        setOptimisticSeal(optimisticSeal + 1)
        setOptimisticBlank(optimisticBlank - 1)
      } else {
        setOptimisticSeal(optimisticSeal - 1)
        setOptimisticBlank(optimisticBlank + 1)
      }
    } else {
      // 新投票
      if (stance === "seal") setOptimisticSeal(optimisticSeal + 1)
      else setOptimisticBlank(optimisticBlank + 1)
    }
    setOptimisticStance(stance)

    return castVote(_prev, formData)
  }, {})

  const handleVote = (stance: "seal" | "blank") => {
    if (!isLoggedIn) {
      window.location.href = loginUrl
      return
    }
    const fd = new FormData()
    fd.set("keywordId", keywordId)
    fd.set("stance", stance)
    action(fd)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => handleVote("seal")}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-500 rounded-sm",
          "border-2 t-fast",
          optimisticStance === "seal"
            ? "bg-cinnabar text-white border-cinnabar rotate--1"
            : "text-cinnabar border-cinnabar/40 hover:border-cinnabar hover:bg-cinnabar-ghost rotate--2"
        )}
        style={optimisticStance === "seal" ? { clipPath: "polygon(2% 0%, 98% 1%, 100% 3%, 99% 97%, 97% 100%, 3% 99%, 0% 96%, 1% 2%)" } : undefined}
      >
        🔴 盖印 {optimisticSeal}
      </button>

      <button
        type="button"
        onClick={() => handleVote("blank")}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-500 rounded-sm",
          "border t-fast",
          optimisticStance === "blank" ? "bg-muted text-foreground border-border" : "text-muted-fg border-border/40 hover:border-border hover:bg-muted"
        )}
      >
        ⚪ 留白 {optimisticBlank}
      </button>
    </div>
  )
}
