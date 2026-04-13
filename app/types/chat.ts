/**
 * renderer 端可直接引用的 chat 业务类型。
 * 从 electron/features/chat/types 做 type-only re-export，避免 renderer 直接
 * 用深层相对路径去 import electron 目录。
 */
export type {
  ChatRow,
  ChatMode,
  ChatStatus,
  ChatMessageRow,
  ChatInvocationRow,
  ChatMemberRow,
  ChatCreateInput,
  ChatSendInput,
  ChatMemberAddInput,
  ChatToolEvent,
  ChatStreamEvent,
  ChatRoundtableEvent,
} from "../../electron/features/chat/types"

export type { InvocationData } from "../../electron/engine/types"
