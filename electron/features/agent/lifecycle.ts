import { scope } from "../../core/logger"
import { nanoid } from "nanoid"
import { agentsRepo } from "../../db/repositories/agents"
import { resolveWorkspacePath } from "../../core/paths"
import { requireCaller } from "../../openclaw/core/connection"
import { agentsCreate, agentsDelete, agentsUpdate } from "../../openclaw/agent/methods"
import { saveUploadedAvatar } from "./avatar"
import { workspaceExists, writeWorkspaceFile } from "./workspace"
import type { AgentRow, AgentCreateInput, AgentUpdateInput, AvatarInput } from "./types"

const agentLog = scope("agent")

/**
 * 新建 agent。两阶段事务：
 * 1. 调 gateway `agents.create` 写配置和 bootstrap 文件
 * 2. 复制头像 / 覆盖用户填的 workspace 文件 / 写 db
 * 任一步失败回滚（调 agents.delete 清理 gateway 侧）。
 */
export async function create(input: AgentCreateInput): Promise<AgentRow> {
  validateAgentFormat(input.agent)
  const workspace = resolveWorkspacePath(input.agent)
  await ensureNotOccupied(input.agent, workspace)

  const client = requireCaller()
  const created = await agentsCreate(client, { name: input.name, workspace, emoji: input.emoji })

  try {
    await writeInitialFiles(created.workspace, input.files)
    const avatarRef = await persistAvatar(created.workspace, input.avatar)
    if (avatarRef) {
      await agentsUpdate(client, { agentId: created.agentId, avatar: avatarRef })
    }
    return insertLocalAgent({
      agent: created.agentId,
      name: input.name,
      workspace: created.workspace,
      emoji: input.emoji ?? null,
      avatar: avatarRef,
    })
  } catch (err) {
    agentLog.error(`创建失败回滚 ${created.agentId}:`, err)
    await agentsDelete(client, { agentId: created.agentId, deleteFiles: true }).catch((e) => agentLog.warn(`回滚失败:`, e))
    throw err
  }
}

/** 结构化更新：通过 gateway 改 name / model / avatar，并同步本地。 */
export async function update(input: AgentUpdateInput): Promise<AgentRow> {
  const row = getRow(input.id)
  const client = requireCaller()
  const avatarRef = input.avatar ? await persistAvatar(row.workspace, input.avatar) : undefined

  await agentsUpdate(client, { agentId: row.agent, name: input.name, model: input.model, avatar: avatarRef ?? undefined })

  const patch: Parameters<typeof agentsRepo.update>[1] = { updated_at: Date.now() }
  if (input.name !== undefined) patch.name = input.name
  if (input.model !== undefined) patch.model = input.model
  if (input.emoji !== undefined) patch.emoji = input.emoji
  if (avatarRef !== undefined) patch.avatar = avatarRef
  agentsRepo.update(input.id, patch)
  return getRow(input.id)
}

/** 删除 agent。孤儿记录只清本地，不再调 gateway 避免 RPC 报错。 */
export async function remove(id: string, removeWorkspace: boolean): Promise<void> {
  const row = getRow(id)
  if (row.sync_state !== "orphan-local") {
    await agentsDelete(requireCaller(), { agentId: row.agent, deleteFiles: removeWorkspace })
  }
  agentsRepo.deleteById(id)
}

/** 批量清理 orphan-local 本地记录，返回删除条数。 */
export function cleanupOrphans(): number {
  return agentsRepo.deleteOrphans()
}

function getRow(id: string): AgentRow {
  const row = agentsRepo.findById(id)
  if (!row) throw new Error("AGENT_NOT_FOUND")
  return row
}

// ---- 私有辅助 ----

function validateAgentFormat(agent: string): void {
  if (!agent) throw new Error("AGENT_ID_EMPTY")
  if (agent === "main") throw new Error("AGENT_ID_RESERVED")
  if (agent.length > 64) throw new Error("AGENT_ID_TOO_LONG")
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(agent)) throw new Error("AGENT_ID_INVALID")
}

async function ensureNotOccupied(agent: string, workspace: string): Promise<void> {
  if (agentsRepo.findByAgent(agent)) throw new Error("AGENT_ID_EXISTS")
  if (await workspaceExists(workspace)) throw new Error("WORKSPACE_EXISTS")
}

async function writeInitialFiles(workspace: string, files: Record<string, string> | undefined): Promise<void> {
  if (!files) return
  for (const [filename, content] of Object.entries(files)) {
    if (content == null || content === "") continue
    await writeWorkspaceFile(workspace, filename, content)
  }
}

async function persistAvatar(workspace: string, avatar: AvatarInput | undefined): Promise<string | null> {
  if (!avatar) return null
  if (avatar.type === "file") return saveUploadedAvatar(workspace, avatar.path)
  return avatar.url
}

function insertLocalAgent(row: { agent: string; name: string; workspace: string; emoji: string | null; avatar: string | null }): AgentRow {
  const id = nanoid()
  const now = Date.now()
  agentsRepo.insert({ id, agent: row.agent, name: row.name, workspace: row.workspace, emoji: row.emoji, avatar: row.avatar, created_at: now, updated_at: now, last_synced_at: now, sync_state: "ok" })
  return getRow(id)
}