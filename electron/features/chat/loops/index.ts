/**
 * 会话 loop 子域:统一编排,direct 是 group N=1 特例,共享 onNewMessage + sendToMember 主流程。
 * 区别:direct 不 pushContext / sharedHistory,decideTargets 自然不递归。
 */

export { hasPending, onAskUserEvent, onMentionNextEvent, onNewMessage, takePending, type GroupDeps } from "./group"
