import { useAgentCacheStore } from "@/stores/agent"

/**
 * Streamdown custom tag `<mention agent_id="...">` 的渲染器。
 *
 * 文本 `@<agentId>` 经 wrapMentionsWithTag 转成
 *   `<mention agent_id="scout">@scout</mention>`
 * 再被 Streamdown 识别 allowedTags + literalTagContent,传到这里渲染成 chip。
 *
 * 样式:半透明背景 ring,与上下文文字色同系,user/agent 两种气泡都可读。
 */
// biome-ignore lint: Streamdown 传入 props 带未定义键,就地解包
export function MentionChip(props: Record<string, unknown>) {
  const byAgentId = useAgentCacheStore((s) => s.byAgentId)
  const agentId = String(props.agent_id ?? "")
  const agent = agentId ? byAgentId[agentId] : undefined
  const name = agent?.name ?? agentId
  const emoji = agent?.identity?.emoji
  const avatarUrl = agent?.identity?.avatarUrl
  return (
    <span className="ring-foreground/15 bg-foreground/5 mx-0.5 inline-flex items-center gap-1 rounded-md px-1 py-0.5 align-baseline text-[0.92em] font-medium leading-none ring-1">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-3.5 shrink-0 rounded-full object-cover" />
      ) : emoji ? (
        <span className="text-[0.9em] leading-none">{emoji}</span>
      ) : null}
      <span>@{name}</span>
    </span>
  )
}
