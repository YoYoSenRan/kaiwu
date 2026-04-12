/**
 * Agent feature 的本地类型定义。
 * - AgentRow：从 drizzle schema 自动推导，字段名严格镜像 sqlite 列名（snake_case）
 * - AgentCreateInput / AgentPatchInput：渲染层提交的业务入参
 * - AgentBridge：暴露给 renderer 的 API 形态
 */

import type { AgentRow } from "../../db/repositories/agents"

export type { AgentRow }

/** 本地 vs gateway 对比结果，与 schema 的 sync_state 枚举保持一致。 */
export type AgentSyncState = AgentRow["sync_state"]

/** 新建表单的 avatar 输入：上传文件 / URL / 未设置。 */
export type AvatarInput = { type: "file"; path: string } | { type: "url"; url: string }

/** 新建 agent 时的完整入参。 */
export interface AgentCreateInput {
  /** openclaw 侧的 agentId，由用户填写（`[a-z0-9_-]` + 首字符字母数字，max 64）。 */
  agent: string
  name: string
  emoji?: string
  avatar?: AvatarInput
  /** workspace 下各初始文件的内容，key 为文件名（SOUL.md / IDENTITY.md / ...）。 */
  files?: Record<string, string>
}

/** 更新本地 kaiwu 元数据。不涉及 gateway 同步字段。 */
export interface AgentPatchInput {
  pinned?: number
  hidden?: number
  sort_order?: number
  tags?: string | null
  remark?: string | null
  last_opened_at?: number | null
}

/** workspace 下单个文件的内容响应。 */
export interface WorkspaceFile {
  name: string
  content: string
}

/** renderer 可以发送给主进程的 agents.update 子集。 */
export interface AgentUpdateInput {
  id: string
  name?: string
  emoji?: string
  model?: string
  avatar?: AvatarInput
}

/**
 * 详情页的数据载荷。
 * 用对象包装而非直接返回 AgentRow，是为了预留扩展——未来加运行时统计 / 聚合指标 / 配置 delta
 * 等字段时不破坏客户端接口，只需在类型里追加可选字段。
 */
export interface AgentDetailData {
  row: AgentRow
}

/** renderer ↔ main 的 agent feature 桥接接口。 */
export interface AgentBridge {
  /** 读本地 sqlite 列表（瞬时）。 */
  list: () => Promise<AgentRow[]>
  /** 跟 gateway 对齐并返回最新本地列表。 */
  sync: () => Promise<AgentRow[]>
  /** 详情页入口：按本地 id 拉单个 agent 的详情数据，不依赖 list store。 */
  detail: (id: string) => Promise<AgentDetailData>
  /** 新建 agent。 */
  create: (input: AgentCreateInput) => Promise<AgentRow>
  /** 删除 agent。removeWorkspace 默认 false。 */
  delete: (id: string, removeWorkspace?: boolean) => Promise<void>
  /** 修改结构化字段（gateway 可改的部分）。 */
  update: (input: AgentUpdateInput) => Promise<AgentRow>
  /** 修改本地元数据（pinned / hidden / tags / remark / ...）。 */
  patch: (id: string, patch: AgentPatchInput) => Promise<AgentRow>
  /** 批量清理孤儿本地记录。 */
  cleanupOrphans: () => Promise<number>

  files: {
    list: (id: string) => Promise<string[]>
    read: (id: string, filename: string) => Promise<string>
    write: (id: string, filename: string, content: string) => Promise<void>
  }

  avatar: {
    /** 打开原生文件选择对话框，返回用户选择的文件路径（取消则 null）。 */
    pick: () => Promise<string | null>
  }
}
