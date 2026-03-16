import { readConfig, writeConfig } from "../gateway"

/**
 * 修改 Agent 的模型配置
 */
export async function updateAgentModel(agentId: string, model: string): Promise<void> {
  const config = await readConfig()
  const agentList = config.agents?.list ?? []

  const agent = agentList.find((a) => a.id === agentId)
  if (!agent) {
    throw new Error(`Agent ${agentId} 不存在于 openclaw.json`)
  }

  agent.model = model
  await writeConfig(config)
}

/**
 * 切换 Agent 的启用/禁用状态
 */
export async function toggleAgentEnabled(agentId: string, enabled: boolean): Promise<void> {
  const config = await readConfig()
  const agentList = config.agents?.list ?? []

  const agent = agentList.find((a) => a.id === agentId)
  if (!agent) {
    throw new Error(`Agent ${agentId} 不存在于 openclaw.json`)
  }

  agent.enabled = enabled
  await writeConfig(config)
}
