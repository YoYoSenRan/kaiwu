import { AgentGrid } from "./components/AgentGrid"
import { SyncButton } from "./components/SyncButton"
import { getAgents } from "./server/queries"

export const metadata = { title: "Agent 管理 | Kaiwu Console" }

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold">Agent 管理</h1>
          <p className="mt-1 text-muted-foreground">把智能体当成一个协作系统来查看，而不是一排排没有主次的卡片。</p>
        </div>
        <SyncButton />
      </div>
      <AgentGrid agents={agents} />
    </div>
  )
}
