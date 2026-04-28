/** 空会话提示:引导用户创建单聊/群聊。 */

import type { TFunction } from "i18next"
import { Bot, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  t: TFunction
  mode?: "direct" | "group"
  onCreate?: (mode: "direct" | "group") => void
}

export function EmptyHint({ t, mode, onCreate }: Props) {
  const Icon = mode === "group" ? Users : mode === "direct" ? Bot : Sparkles
  return (
    <div className="flex h-full items-center justify-center transition-opacity duration-500 ease-out">
      <div className="animate-in fade-in-0 zoom-in-95 flex flex-col items-center gap-5 text-center duration-500">
        <div className="from-primary/20 via-primary/10 ring-primary/20 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br to-transparent ring-1">
          <Icon className="text-primary size-8" />
        </div>
        <div className="space-y-1.5">
          <p className="text-foreground text-lg font-medium tracking-tight">{t("chat.empty.title")}</p>
          <p className="text-muted-foreground mx-auto max-w-[280px] text-sm leading-relaxed">{t("chat.empty.description")}</p>
        </div>
        {onCreate && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onCreate("direct")}>
              <Bot className="mr-1 size-4" />
              {t("chat.empty.newDirect")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onCreate("group")}>
              <Users className="mr-1 size-4" />
              {t("chat.empty.newGroup")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
