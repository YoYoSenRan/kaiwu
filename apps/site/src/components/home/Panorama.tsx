/** 开物局全景图——8 个局中人在各自位置显示状态 */
import { db, agents } from "@kaiwu/db"
import { AgentBubble } from "./AgentBubble"

/** Agent 在全景图中的位置配置 */
const AGENT_POSITIONS: Record<string, { area: string; x: string; y: string }> = {
  youshang: { area: "前堂", x: "8%", y: "40%" },
  shuike: { area: "前堂", x: "25%", y: "30%" },
  zhengchen: { area: "前堂", x: "25%", y: "55%" },
  zhangcheng: { area: "前堂", x: "38%", y: "42%" },
  huashi: { area: "内坊", x: "52%", y: "35%" },
  jiangren: { area: "内坊", x: "65%", y: "45%" },
  shijian: { area: "内坊", x: "78%", y: "38%" },
  mingluo: { area: "后院", x: "92%", y: "42%" },
}

/** 全景图（Server Component） */
export async function Panorama(): Promise<React.ReactElement> {
  const allAgents = await db.select().from(agents)

  return (
    <section className="relative w-full overflow-x-auto">
      <div className="relative min-w-[800px] h-[320px] rounded-lg border border-border bg-surface">
        {/* 区域分隔线 + 标签 */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 border-r border-border/50 flex items-end justify-center pb-2">
            <span className="text-xs text-muted-fg">前堂</span>
          </div>
          <div className="flex-1 border-r border-border/50 flex items-end justify-center pb-2">
            <span className="text-xs text-muted-fg">内坊</span>
          </div>
          <div className="flex-[0.5] flex items-end justify-center pb-2">
            <span className="text-xs text-muted-fg">后院</span>
          </div>
        </div>

        {/* Agent 气泡 */}
        {allAgents.map((agent) => {
          const pos = AGENT_POSITIONS[agent.id]
          if (!pos) return null
          return (
            <div key={agent.id} className="absolute" style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}>
              <AgentBubble emoji={agent.emoji} name={agent.name} title={agent.title} status={agent.status} activity={agent.activity} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
