/**
 * Agent 管理的业务服务层。
 *
 * 架构备注：本文件会 import `features/openclaw/*` 的若干模块（requireClient / methods），
 * 这是有意为之——openclaw 在 kaiwu 里扮演 infra feature 的角色，所有基于 gateway 的
 * 业务 feature（agent/task/chat…）都需要它提供的 client 与 RPC 包装。
 * 替代方案是把 gateway client 下沉到 core/，但那样会把协议细节泄漏到基础设施层。
 */

import log from "../../core/logger"
import { dialog } from "electron"
import { nanoid } from "nanoid"
import { saveUploadedAvatar } from "./core/avatar"
import { agentsRepo } from "../../db/repositories/agents"
import { getMainWindow } from "../../core/window"
import { resolveWorkspacePath } from "../../core/paths"
import { requireClient } from "../openclaw/core/connection"
import { agentsCreate, agentsDelete, agentsList, agentsUpdate } from "../openclaw/agent/methods"
import { listWorkspaceFiles, readWorkspaceFile, workspaceExists, writeWorkspaceFile } from "./core/workspace"
import type { GatewayAgentRow } from "../openclaw/agent/contract"
import type { AgentDetailData, AgentRow, AgentCreateInput, AgentPatchInput, AgentUpdateInput, AvatarInput } from "./types"

/** 按 kaiwu 展示顺序返回本地 agents。 */
export function listLocal(): AgentRow[] {
  return agentsRepo.list()
}

/**
 * 详情页数据入口：按本地 id 拉单个 agent。
 * 和 listLocal 并列的顶层 service 函数——detail 页可以 deep link 直接访问，
 * 不依赖 list 的 store 状态。未来聚合字段（运行时状态、配置 delta 等）都加在这个函数里。
 */
export function getDetail(id: string): AgentDetailData {
  return { row: getRow(id) }
}

/**
 * 与 gateway 对齐本地缓存。
 * 远端独有 → 补录；两边都有 → 远端覆盖权威字段、保留本地元数据；
 * 本地独有 → 标记 orphan-local；workspace 磁盘缺失 → 标记 workspace-missing。
 */
export async function sync(): Promise<AgentRow[]> {
  const client = requireClient()
  const remote = await agentsList(client)
  const now = Date.now()

  // transaction 只能跑同步代码，workspace 检查提前做
  const workspaceChecks = new Map<string, boolean>()
  for (const r of remote.agents) {
    workspaceChecks.set(r.id, r.workspace ? await workspaceExists(r.workspace) : false)
  }

  const localRows = agentsRepo.listAll()
  const localByAgent = new Map(localRows.map((r) => [r.agent, r]))
  const remoteIds = new Set(remote.agents.map((a) => a.id))

  agentsRepo.transaction(() => {
    for (const r of remote.agents) {
      applyRemoteRow(r, localByAgent.get(r.id), workspaceChecks.get(r.id) ?? false, now)
    }
    for (const local of localRows) {
      if (!remoteIds.has(local.agent)) {
        agentsRepo.markOrphan(local.id, now)
      }
    }
  })

  return listLocal()
}

/** sync 内部：把单条远端行 upsert 到本地。 */
function applyRemoteRow(r: GatewayAgentRow, local: AgentRow | undefined, workspaceOk: boolean, now: number): void {
  const sync_state = workspaceOk ? "ok" : "workspace-missing"
  const model = r.model?.primary ?? null
  const emoji = r.identity?.emoji ?? null
  const avatar = r.identity?.avatar ?? null
  const avatar_url = r.identity?.avatarUrl ?? null
  const name = r.name ?? r.id
  const workspace = r.workspace ?? ""

  if (!local) {
    agentsRepo.insert({
      id: nanoid(),
      agent: r.id,
      name,
      workspace,
      model,
      emoji,
      avatar,
      avatar_url,
      created_at: now,
      updated_at: now,
      last_synced_at: now,
      sync_state,
    })
    return
  }
  agentsRepo.update(local.id, { name, workspace, model, emoji, avatar, avatar_url, updated_at: now, last_synced_at: now, sync_state })
}

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

  const client = requireClient()
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
    log.error(`[agent/create] 失败回滚 ${created.agentId}:`, err)
    await agentsDelete(client, { agentId: created.agentId, deleteFiles: true }).catch((e) => log.warn(`[agent/create] 回滚失败:`, e))
    throw err
  }
}

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
  agentsRepo.insert({
    id,
    agent: row.agent,
    name: row.name,
    workspace: row.workspace,
    emoji: row.emoji,
    avatar: row.avatar,
    created_at: now,
    updated_at: now,
    last_synced_at: now,
    sync_state: "ok",
  })
  return getRow(id)
}

/** 结构化更新：通过 gateway 改 name / model / avatar，并同步本地。 */
export async function update(input: AgentUpdateInput): Promise<AgentRow> {
  const row = getRow(input.id)
  const client = requireClient()
  const avatarRef = input.avatar ? await persistAvatar(row.workspace, input.avatar) : undefined

  await agentsUpdate(client, {
    agentId: row.agent,
    name: input.name,
    model: input.model,
    avatar: avatarRef ?? undefined,
  })

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
    await agentsDelete(requireClient(), { agentId: row.agent, deleteFiles: removeWorkspace })
  }
  agentsRepo.deleteById(id)
}

/** 仅更新 kaiwu 本地元数据。不触发 gateway RPC。 */
export function patchMeta(id: string, patch: AgentPatchInput): AgentRow {
  const cleaned: Parameters<typeof agentsRepo.update>[1] = {}
  if (patch.pinned !== undefined) cleaned.pinned = patch.pinned
  if (patch.hidden !== undefined) cleaned.hidden = patch.hidden
  if (patch.sort_order !== undefined) cleaned.sort_order = patch.sort_order
  if (patch.tags !== undefined) cleaned.tags = patch.tags
  if (patch.remark !== undefined) cleaned.remark = patch.remark
  if (patch.last_opened_at !== undefined) cleaned.last_opened_at = patch.last_opened_at
  if (Object.keys(cleaned).length === 0) return getRow(id)
  cleaned.updated_at = Date.now()
  agentsRepo.update(id, cleaned)
  return getRow(id)
}

/** 批量清理 orphan-local 本地记录，返回删除条数。 */
export function cleanupOrphans(): number {
  return agentsRepo.deleteOrphans()
}

export async function listFiles(id: string): Promise<string[]> {
  return listWorkspaceFiles(getRow(id).workspace)
}

export async function readFile(id: string, filename: string): Promise<string> {
  return readWorkspaceFile(getRow(id).workspace, filename)
}

export async function writeFile(id: string, filename: string, content: string): Promise<void> {
  await writeWorkspaceFile(getRow(id).workspace, filename, content)
}

/** 弹出原生文件选择对话框挑头像文件，返回绝对路径或 null。 */
export async function pickAvatar(): Promise<string | null> {
  const parent = getMainWindow()
  const opts: Electron.OpenDialogOptions = {
    title: "选择头像",
    properties: ["openFile"],
    filters: [{ name: "图像", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  }
  const result = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
}

/** 按本地 id 查 agent 行，找不到抛错。 */
function getRow(id: string): AgentRow {
  const row = agentsRepo.findById(id)
  if (!row) throw new Error("AGENT_NOT_FOUND")
  return row
}
