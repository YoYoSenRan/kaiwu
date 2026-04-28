/**
 * 路由子域:决定本轮消息给谁、解析 @、抽卡片。
 *
 *  - decide:  decideTargets (给定 msg + mentions + replyTo → target members)
 *  - mention: parse/sanitize/strip @<agentId> 文本
 *  - card:    ```card``` fence → ChatCard[]
 */

export * from "./decide"
export * from "./mention"
export * from "./card"
