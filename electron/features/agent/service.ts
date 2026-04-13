/**
 * Agent 管理的业务服务层。
 *
 * openclaw 是平台 SDK 层（electron/openclaw/），所有基于 gateway 的
 * 业务 feature（agent/chat/knowledge…）通过它访问 client 与 RPC 包装。
 */

import { dialog } from "electron"
import { nanoid } from "nanoid"
import { agentsRepo } from "../../db/repositories/agents"
import { getMainWindow } from "../../core/window"
import { requireCaller } from "../../openclaw/core/connection"
import { agentsList } from "../../openclaw/agent/methods"
import { listWorkspaceFiles, readWorkspaceFile, workspaceExists, writeWorkspaceFile } from "./workspace"
import type { GatewayAgentRow } from "../../openclaw/agent/contract"
import type { AgentDetailData, AgentRow, AgentPatchInput } from "./types"

export { create, update, remove, cleanupOrphans } from "./lifecycle"

/** 按 kaiwu 展示顺序返回本地 agents。 */
export function listLocal(): AgentRow[] {
  return agentsRepo.list()
}

/**
 * 详情页数据入口：按本地 id 拉单个 agent。
 * detail 页可以 deep link 直接访问，不依赖 list 的 store 状态。
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
  const client = requireCaller()
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
    agentsRepo.insert({ id: nanoid(), agent: r.id, name, workspace, model, emoji, avatar, avatar_url, created_at: now, updated_at: now, last_synced_at: now, sync_state })
    return
  }
  agentsRepo.update(local.id, { name, workspace, model, emoji, avatar, avatar_url, updated_at: now, last_synced_at: now, sync_state })
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
export function getRow(id: string): AgentRow {
  const row = agentsRepo.findById(id)
  if (!row) throw new Error("AGENT_NOT_FOUND")
  return row
}
