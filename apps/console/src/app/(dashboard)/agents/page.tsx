import { AgentGrid } from "./components/AgentGrid"
import { SyncButton } from "./components/SyncButton"
import { getAgents } from "./queries"

export const metadata = { title: "Agent 管理 | Kaiwu Console" }

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent 管理</h1>
          <p className="text-muted-foreground">查看和管理当前主题下的所有 Agent</p>
        </div>
        <SyncButton />
      </div>
      <AgentGrid agents={agents} />
    </div>
  )
}
