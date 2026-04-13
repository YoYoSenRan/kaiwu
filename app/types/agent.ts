/**
 * renderer 端可直接引用的 agent 业务类型。
 * 从 electron/features/agent/types 做 type-only re-export，避免 renderer 直接
 * 用深层相对路径去 import electron 目录。
 */
export type {
  AgentRow,
  AvatarInput,
  AgentCreateInput,
  AgentDetailData,
  AgentPatchInput,
  AgentSyncState,
  AgentUpdateInput,
  WorkspaceFile,
} from "../../electron/features/agent/types"
export type { GatewayAgentRow, ModelChoice } from "../../electron/openclaw/agent/contract"
