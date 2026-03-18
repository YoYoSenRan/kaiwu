import { db, agentLogs, agents } from "@kaiwu/db"
import { eq, desc } from "drizzle-orm"
import { InkWash } from "@/components/ui/InkWash"
import { Panorama } from "@/components/home/Panorama"
import { ChatFeed } from "@/components/home/ChatFeed"

export default async function HomePage(): Promise<React.ReactElement> {
  const initialMessages = await loadRecentMessages()

  return (
    <>
      <InkWash variant="hero" className="min-h-[40vh] flex items-center justify-center -mx-6 lg:-mx-8 -mt-px">
        <div className="text-center">
          <h1 className="font-display text-5xl md:text-6xl font-700 tracking-[0.15em] text-foreground">開 物 局</h1>
          <p className="mt-4 text-base md:text-lg text-muted-fg">天工开物，每帖必应。</p>
        </div>
      </InkWash>

      <div className="py-12 space-y-12">
        <Panorama />
        <ChatFeed initialMessages={initialMessages} />
      </div>
    </>
  )
}

/** 加载最近的公开消息（Server Component 数据获取） */
async function loadRecentMessages() {
  const logs = await db
    .select({ id: agentLogs.id, agentId: agentLogs.agentId, content: agentLogs.content, type: agentLogs.type, createdAt: agentLogs.createdAt })
    .from(agentLogs)
    .where(eq(agentLogs.visibility, "public"))
    .orderBy(desc(agentLogs.createdAt))
    .limit(50)

  const allAgents = await db.select().from(agents)
  const agentMap = new Map(allAgents.map((a) => [a.id, a]))

  return logs.reverse().map((log) => {
    const agent = agentMap.get(log.agentId)
    return {
      id: log.id,
      agentEmoji: agent?.emoji ?? "📢",
      agentName: agent?.name ?? log.agentId,
      agentTitle: agent?.title ?? "",
      content: log.content,
      type: log.type,
      createdAt: log.createdAt.toISOString(),
    }
  })
}
