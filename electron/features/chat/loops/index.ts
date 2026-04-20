/**
 * 会话 loop 子域:处理消息的编排逻辑。
 *
 *  - direct: 单聊 (1 agent,线性 send → stream → final)
 *  - group:  群聊 (N agent,fan-out + 递归 + mention 路由 + ask_user 挂起)
 */

export { sendDirect, type DirectDeps } from "./direct"
export { hasPending, onAskUserEvent, onMentionNextEvent, onNewMessage, takePending, type GroupDeps } from "./group"
