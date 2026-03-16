import { readFile, writeFile, copyFile, access } from "node:fs/promises"
import { OPENCLAW_JSON_PATH } from "../constants"

export interface OpenClawConfig {
  agents?: { list?: AgentEntry[]; [key: string]: unknown }
  [key: string]: unknown
}

export interface AgentEntry {
  id: string
  workspace?: string
  model?: string
  enabled?: boolean
  subagents?: { allowAgents?: string[]; [key: string]: unknown }
  [key: string]: unknown
}

/**
 * 读取 openclaw.json 配置
 */
export async function readConfig(): Promise<OpenClawConfig> {
  try {
    const raw = await readFile(OPENCLAW_JSON_PATH, "utf-8")
    return JSON.parse(raw) as OpenClawConfig
  } catch {
    return {}
  }
}

/**
 * 写入 openclaw.json 配置（自动备份）
 */
export async function writeConfig(config: OpenClawConfig): Promise<void> {
  await backupConfig()
  await writeFile(OPENCLAW_JSON_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8")
}

/**
 * 备份 openclaw.json
 */
async function backupConfig(): Promise<void> {
  try {
    await access(OPENCLAW_JSON_PATH)
    const timestamp = Date.now()
    await copyFile(OPENCLAW_JSON_PATH, `${OPENCLAW_JSON_PATH}.bak.${timestamp}`)
  } catch {
    // 文件不存在，无需备份
  }
}
