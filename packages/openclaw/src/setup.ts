import { mkdir, writeFile, readFile, copyFile, access } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

import { listAgentFiles, loadManifest, readAgentFile, validateTemplateIntegrity } from "@kaiwu/templates"
import type { InitOptions, InitResult, Manifest } from "@kaiwu/templates"

const DEFAULT_OPENCLAW_DIR = join(homedir(), ".openclaw")

/**
 * 一键初始化模板：创建 workspace → 部署 SOUL.md → 写入 AGENTS.md → 注册 openclaw.json → 重启 Gateway
 * @param slug 模板标识符
 * @param options 初始化选项
 */
async function initializeTemplate(slug: string, options?: InitOptions): Promise<InitResult> {
  const openclawDir = options?.openclawDir ?? DEFAULT_OPENCLAW_DIR
  const skipRestart = options?.skipRestart ?? false

  // 1. 读取并校验模板
  const manifest = await loadManifest(slug)
  const integrity = await validateTemplateIntegrity(slug)
  if (!integrity.valid) {
    throw new Error(`模板 ${slug} 缺少以下 Agent 的 SOUL.md：${integrity.missing.join(", ")}`)
  }

  // 2. 创建 workspace 目录 + 同步 agent 目录所有文件 + 写入 AGENTS.md
  const workspacesCreated: string[] = []
  for (const agent of manifest.agents) {
    const workspaceDir = join(openclawDir, `workspace-${agent.id}`)
    await mkdir(workspaceDir, { recursive: true })

    // 同步模板 agent 目录下的所有文件到 workspace
    const files = await listAgentFiles(slug, agent.id)
    for (const filePath of files) {
      const destPath = join(workspaceDir, filePath)
      await mkdir(dirname(destPath), { recursive: true })
      await backupIfExists(destPath)
      const content = await readAgentFile(slug, agent.id, filePath)
      await writeFile(destPath, content, "utf-8")
    }

    // 写入工作协议 AGENTS.md
    const agentsMdDest = join(workspaceDir, "AGENTS.md")
    await backupIfExists(agentsMdDest)
    await writeFile(agentsMdDest, formatWorkProtocol(manifest), "utf-8")

    workspacesCreated.push(workspaceDir)
  }

  // 3. 注册到 openclaw.json
  const openclawJsonUpdated = await registerToOpenclawJson(openclawDir, manifest)

  // 4. 重启 Gateway
  let gatewayRestarted = false
  if (!skipRestart) {
    gatewayRestarted = await restartGateway()
  }

  return { slug, workspacesCreated, agentsRegistered: manifest.agents.map((a) => a.id), openclawJsonUpdated, gatewayRestarted }
}

/**
 * 如果文件存在则创建时间戳备份
 */
async function backupIfExists(filePath: string): Promise<void> {
  try {
    await access(filePath)
    const timestamp = Date.now()
    await copyFile(filePath, `${filePath}.bak.${timestamp}`)
  } catch {
    // 文件不存在，无需备份
  }
}

/**
 * 将工作协议格式化为 Markdown
 */
function formatWorkProtocol(manifest: Manifest): string {
  return `# 工作协议 — ${manifest.name}\n\n${manifest.workProtocol}\n`
}

/**
 * 注册 Agent 到 openclaw.json
 * 读取现有配置 → 备份 → upsert agents.list → 写回
 */
async function registerToOpenclawJson(openclawDir: string, manifest: Manifest): Promise<boolean> {
  const jsonPath = join(openclawDir, "openclaw.json")

  let config: Record<string, unknown> = {}
  try {
    const raw = await readFile(jsonPath, "utf-8")
    config = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // openclaw.json 不存在或解析失败，用空对象
  }

  // 备份
  await backupIfExists(jsonPath)

  // 获取或初始化 agents 部分
  const agents = (config.agents ?? {}) as Record<string, unknown>
  const agentList = (agents.list ?? []) as Array<Record<string, unknown>>

  for (const agent of manifest.agents) {
    const existingIndex = agentList.findIndex((a) => a.id === agent.id)
    const agentEntry: Record<string, unknown> = { id: agent.id, workspace: `workspace-${agent.id}`, subagents: { allowAgents: manifest.permissions[agent.id]?.allowAgents ?? [] } }

    if (existingIndex >= 0) {
      // 更新已有条目
      agentList[existingIndex] = { ...agentList[existingIndex], ...agentEntry }
    } else {
      agentList.push(agentEntry)
    }
  }

  agents.list = agentList
  config.agents = agents

  await writeFile(jsonPath, JSON.stringify(config, null, 2) + "\n", "utf-8")
  return true
}

/**
 * 重启 OpenClaw Gateway
 * 调用 CLI 命令，失败时回滚 openclaw.json
 */
async function restartGateway(): Promise<boolean> {
  try {
    const { execFile } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const execFileAsync = promisify(execFile)
    await execFileAsync("openclaw", ["gateway", "restart"])
    return true
  } catch {
    // Gateway 重启失败（可能未安装 openclaw CLI）
    return false
  }
}

export { initializeTemplate }
