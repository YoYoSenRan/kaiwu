/**
 * agent feature 的对外公开契约。
 *
 * 本文件只放 renderer 可消费的类型（bridge 接口、入参/出参、列表/详情 payload）。
 * 主进程私有类型（service 内部状态等）如有应拆到 internal.ts。
 *
 * renderer 通过 tsconfig 的 `@contracts/agent` alias 引用；
 * 主进程 feature 内部用相对路径 `./contracts`。
 *
 * 设计背景：本地表只存 agent_id 索引，真实字段全部来自 openclaw gateway。
 * tab 分区（mine/unsynced/missing）由 service 每次 list 派生，不入 DB。
 */

import type {
  AgentIdentityGetResult,
  AgentWorkspaceFile,
  GatewayAgentRow,
  SkillsStatusResult,
  ToolsCatalogResult,
  ToolsEffectiveResult,
} from "../openclaw/contracts/rpc"

/** kaiwu 本地 agents 表行。 */
export interface AgentRow {
  agentId: string
  createdAt: number
  updatedAt: number
}

/** 派生的状态：mine = 双方都有，unsynced = 仅网关，missing = 仅本地。 */
export type AgentListStatus = "mine" | "unsynced" | "missing"

/** 列表条目。status 决定 gateway/local 哪个字段存在。 */
export interface AgentListEntry {
  agentId: string
  status: AgentListStatus
  gateway?: GatewayAgentRow
  local?: AgentRow
}

/** list RPC 返回。gatewayReady=false 时 mine/unsynced 为空，不做 missing 计算。 */
export interface AgentListResult {
  gatewayReady: boolean
  gatewayEmpty: boolean
  defaultId?: string
  mine: AgentListEntry[]
  unsynced: AgentListEntry[]
  missing: AgentListEntry[]
}

export interface AgentCreateInput {
  name: string
  workspace: string
  model?: string
  emoji?: string
  avatar?: string
}

export interface AgentUpdateInput {
  agentId: string
  name?: string
  workspace?: string
  model?: string
  emoji?: string
  avatar?: string
}

/** 删除策略。purge = 网关 + 本地；unlink = 仅本地。 */
export type AgentDeleteStrategy = { kind: "purge"; deleteFiles: boolean } | { kind: "unlink" }

export interface AgentDeleteInput {
  agentId: string
  strategy: AgentDeleteStrategy
}

export interface AgentImportInput {
  agentIds: string[]
}

/** workspace 文件项：openclaw 原字段 + kaiwu 标注 writable。 */
export interface AgentDetailFile extends AgentWorkspaceFile {
  /** 是否允许通过 filesSet 写入。由主进程根据白名单标注，前端直接用。 */
  writable: boolean
}

/** workspace 聚合视图。 */
export interface AgentWorkspaceView {
  workspace: string
  files: AgentDetailFile[]
}

/** 详情聚合。单次 RPC 拉全，失败字段为 undefined。 */
export interface AgentDetail {
  agentId: string
  gateway?: GatewayAgentRow
  identity?: AgentIdentityGetResult
  files?: AgentWorkspaceView
  skills?: SkillsStatusResult
  toolsCatalog?: ToolsCatalogResult
  toolsEffective?: ToolsEffectiveResult
}

/** preload bridge 契约。window.electron.agent.*。 */
export interface AgentBridge {
  list: () => Promise<AgentListResult>
  detail: (agentId: string) => Promise<AgentDetail>
  create: (input: AgentCreateInput) => Promise<{ agentId: string }>
  update: (input: AgentUpdateInput) => Promise<{ ok: true }>
  delete: (input: AgentDeleteInput) => Promise<{ ok: true; removedBindings?: number }>
  importUnsynced: (input: AgentImportInput) => Promise<{ imported: number }>
  filesGet: (input: { agentId: string; name: string }) => Promise<{ content: string }>
  filesSet: (input: { agentId: string; name: string; content: string }) => Promise<{ ok: true }>
}
