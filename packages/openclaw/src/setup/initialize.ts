import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { listAgentFiles, loadManifest, readAgentFile, validateTemplateIntegrity } from "@kaiwu/templates"
import type { InitOptions, InitResult, Manifest } from "@kaiwu/templates"

import { OPENCLAW_DIR } from "../constants"
import { readConfig, writeConfig, type AgentEntry } from "../gateway"

/**
 * 一键初始化模板：创建 workspace → 部署文件 → 写入 AGENTS.md → 注册 openclaw.json → 重启 Gateway
 */
export async function initializeTemplate(slug: string, options?: InitOptions): Promise<InitResult> {
  const openclawDir = options?.openclawDir ?? OPENCLAW_DIR
  const skipRestart = options?.skipRestart ?? false

  const manifest = await loadManifest(slug)
  const integrity = await validateTemplateIntegrity(slug)
  if (!integrity.valid) {
    throw new Error(`模板 ${slug} 缺少以下 Agent 的 SOUL.md：${integrity.missing.join(", ")}`)
  }

  const workspacesCreated: string[] = []
  for (const agent of manifest.agents) {
    const workspaceDir = join(openclawDir, `workspace-${agent.id}`)
    await mkdir(workspaceDir, { recursive: true })

    const files = await listAgentFiles(slug, agent.id)
    for (const filePath of files) {
      const destPath = join(workspaceDir, filePath)
      await mkdir(dirname(destPath), { recursive: true })
      const content = await readAgentFile(slug, agent.id, filePath)
      await writeFile(destPath, content, "utf-8")
    }

    const agentsMdDest = join(workspaceDir, "AGENTS.md")
    await writeFile(agentsMdDest, formatWorkProtocol(manifest), "utf-8")

    workspacesCreated.push(workspaceDir)
  }

  await registerAgents(manifest)

  let gatewayRestarted = false
  if (!skipRestart) {
    const { restartGateway } = await import("../gateway")
    gatewayRestarted = await restartGateway()
  }

  return { slug, workspacesCreated, agentsRegistered: manifest.agents.map((a) => a.id), openclawJsonUpdated: true, gatewayRestarted }
}

function formatWorkProtocol(manifest: Manifest): string {
  return `# 工作协议 — ${manifest.name}\n\n${manifest.workProtocol}\n`
}

async function registerAgents(manifest: Manifest): Promise<void> {
  const config = await readConfig()

  const agents = config.agents ?? {}
  const agentList: AgentEntry[] = [...(agents.list ?? [])]

  for (const agent of manifest.agents) {
    const existingIndex = agentList.findIndex((a) => a.id === agent.id)
    const entry: AgentEntry = { id: agent.id, workspace: `workspace-${agent.id}`, subagents: { allowAgents: manifest.permissions[agent.id]?.allowAgents ?? [] } }

    if (existingIndex >= 0) {
      agentList[existingIndex] = { ...agentList[existingIndex], ...entry }
    } else {
      agentList.push(entry)
    }
  }

  agents.list = agentList
  config.agents = agents

  await writeConfig(config)
}
