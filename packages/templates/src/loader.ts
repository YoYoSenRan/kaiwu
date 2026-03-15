import { readdir, readFile, access } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { ManifestSchema } from "./types"
import type { Manifest, TemplateSummary } from "./types"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, "presets")

/**
 * 列出所有可用模板的摘要信息
 * 扫描 templates/ 目录下的子目录，读取各自的 manifest.json
 */
async function listTemplates(): Promise<TemplateSummary[]> {
  const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory())

  const summaries: TemplateSummary[] = []

  for (const dir of dirs) {
    const manifestPath = join(TEMPLATES_DIR, dir.name, "manifest.json")
    try {
      await access(manifestPath)
      const manifest = await loadManifest(dir.name)
      summaries.push({ slug: manifest.slug, name: manifest.name, description: manifest.description, version: manifest.version, agentCount: manifest.agents.length })
    } catch {
      // 跳过无效模板目录（无 manifest.json 或校验失败）
    }
  }

  return summaries
}

/**
 * 读取并校验指定模板的 manifest.json
 * @param slug 模板标识符（即目录名）
 */
async function loadManifest(slug: string): Promise<Manifest> {
  const manifestPath = join(TEMPLATES_DIR, slug, "manifest.json")
  const raw = await readFile(manifestPath, "utf-8")
  const json: unknown = JSON.parse(raw)
  return validateManifest(json)
}

/**
 * 校验 manifest 数据结构
 * @param data 待校验的原始数据
 */
function validateManifest(data: unknown): Manifest {
  return ManifestSchema.parse(data)
}

/**
 * 获取模板内 Agent 目录的路径
 * @param slug 模板标识符
 * @param agentId Agent ID
 */
function getAgentDir(slug: string, agentId: string): string {
  return join(TEMPLATES_DIR, slug, "agents", agentId)
}

/**
 * 列出指定 Agent 目录下的所有文件（相对路径）
 * @param slug 模板标识符
 * @param agentId Agent ID
 */
async function listAgentFiles(slug: string, agentId: string): Promise<string[]> {
  const agentDir = getAgentDir(slug, agentId)
  const entries = await readdir(agentDir, { withFileTypes: true, recursive: true })
  return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath ?? e.path, e.name).slice(agentDir.length + 1))
}

/**
 * 读取指定 Agent 目录下的某个文件
 * @param slug 模板标识符
 * @param agentId Agent ID
 * @param filePath 相对于 agent 目录的文件路径
 */
async function readAgentFile(slug: string, agentId: string, filePath: string): Promise<string> {
  return readFile(join(getAgentDir(slug, agentId), filePath), "utf-8")
}

/**
 * 校验模板完整性：检查所有 Agent 目录是否存在且包含 SOUL.md
 * @param slug 模板标识符
 */
async function validateTemplateIntegrity(slug: string): Promise<{ valid: boolean; missing: string[] }> {
  const manifest = await loadManifest(slug)
  const missing: string[] = []

  for (const agent of manifest.agents) {
    try {
      await access(join(getAgentDir(slug, agent.id), "SOUL.md"))
    } catch {
      missing.push(agent.id)
    }
  }

  return { valid: missing.length === 0, missing }
}

export { getAgentDir, listAgentFiles, listTemplates, loadManifest, readAgentFile, validateManifest, validateTemplateIntegrity }
