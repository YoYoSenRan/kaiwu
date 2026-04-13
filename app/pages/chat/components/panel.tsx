import { useTranslation } from "react-i18next"
import { useChatStore } from "@/stores/chat"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface InfoPanelProps {
  chat: { id: string; mode: string; config: string }
}

/** 解析 JSON 字符串，失败返回空对象。 */
function safeJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** 右侧信息面板：agent 信息、上下文预算、统计。 */
export function InfoPanel({ chat }: InfoPanelProps) {
  const { t } = useTranslation()
  const members = useChatStore((s) => s.members)
  const messages = useChatStore((s) => s.messages)
  const currentSpeaker = useChatStore((s) => s.currentSpeaker)
  const roundtableStatus = useChatStore((s) => s.roundtableStatus)

  const config = safeJson(chat.config)
  const isRoundtable = chat.mode === "roundtable"

  // 上下文预算百分比（从 config 读取，默认 fallback）
  const budget = (config.contextBudget ?? {}) as Record<string, number>
  const historyPct = budget.history ?? 40
  const knowledgePct = budget.knowledge ?? 30
  const memoryPct = budget.memory ?? 20
  const systemPct = budget.system ?? 10

  return (
    <div className="flex w-60 shrink-0 flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* 参与者 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">{isRoundtable ? t("chat.panel.participants") : t("chat.panel.agent")}</h3>
            <div className="space-y-1.5">
              {members.map((m) => {
                const mc = safeJson(m.config)
                const speaking = currentSpeaker === m.agent_id && roundtableStatus === "running"
                return (
                  <div key={m.agent_id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                    <span className="bg-muted flex size-6 items-center justify-center rounded-full text-xs font-medium">{(m.agent_id ?? "?").slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0 flex-1 truncate text-xs">{m.agent_id}</span>
                    {speaking && <span className="text-xs text-emerald-400">{t("chat.roundtable.speaking")}</span>}
                    {typeof mc.role === "string" && <span className="text-muted-foreground text-xs">{mc.role}</span>}
                  </div>
                )
              })}
            </div>
          </section>

          <Separator />

          {/* 上下文预算 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">{t("chat.panel.contextBudget")}</h3>
            <div className="space-y-2">
              <BudgetBar label={t("chat.panel.history")} value={historyPct} />
              <BudgetBar label={t("chat.panel.knowledge")} value={knowledgePct} />
              <BudgetBar label={t("chat.panel.memory")} value={memoryPct} />
              <BudgetBar label={t("chat.panel.systemReserved")} value={systemPct} />
            </div>
          </section>

          <Separator />

          {/* 圆桌编排参数 */}
          {isRoundtable && typeof config.orchestration === "object" && config.orchestration !== null && (
            <>
              <section>
                <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">{t("chat.panel.orchestration")}</h3>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("chat.panel.turnStrategy")}</dt>
                    <dd>{String((config.orchestration as Record<string, unknown>).turnStrategy ?? "—")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("chat.panel.maxRounds")}</dt>
                    <dd>{String((config.orchestration as Record<string, unknown>).maxRounds ?? "—")}</dd>
                  </div>
                </dl>
              </section>
              <Separator />
            </>
          )}

          {/* 统计 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">{t("chat.panel.stats")}</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("chat.panel.messageCount")}</dt>
                <dd>{messages.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("chat.panel.tokenUsage")}</dt>
                <dd title="粗略估算，仅供参考">~{estimateTokens(messages)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}

/** 预算进度条。 */
function BudgetBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className="h-1" />
    </div>
  )
}

/** 粗略估算 token 数（中文约 1.5 token/字，英文约 0.75 token/word）。 */
function estimateTokens(messages: { content: string }[]): number {
  const totalChars = messages.reduce((acc, m) => acc + m.content.length, 0)
  return Math.round(totalChars * 0.75)
}
