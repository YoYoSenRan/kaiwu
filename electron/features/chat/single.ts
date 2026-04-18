/**
 * 单聊入口：薄封装，复用群聊 loop（单聊 = 只有 1 个成员的群）。
 *
 * 存在此文件只为未来若需要 single-only 优化（如 bypass context 拼装）有落点。
 * 当前直接调 group.onNewMessage。
 */

import { onNewMessage } from "./group"
import type { GroupDeps } from "./group"
import type { ChatMessage } from "./types"

export function onUserMessage(deps: GroupDeps, sessionId: string, msg: ChatMessage): Promise<void> {
  return onNewMessage(deps, sessionId, msg)
}
