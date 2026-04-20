/**
 * 路由子域:决定本轮消息给谁,怎么解析 @,怎么抽卡片。
 *
 *  - decide:  decideTargets (给定 msg + mentions + replyTo → target members)
 *  - mention-utils: parse/sanitize/strip @<agentId> 文本
 *  - card-extract:  ```card``` fence → ChatCard[]
 */

export * from "./decide"
export * from "./mention-utils"
export * from "./card-extract"
