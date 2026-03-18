## ADDED Requirements

### Requirement: Agent 调用封装

`packages/domain/src/agents/caller.ts` 的 `callAgent()` SHALL：
1. 通过 Gateway API 创建 isolated session
2. 发送 message 给指定 Agent
3. 等待 Agent 返回（含超时处理）
4. 记录 agent_called 事件
5. 返回 `{ success, output, error, durationMs }`

#### Scenario: 调用成功
- **WHEN** callAgent({ agentId: "youshang", message: "采风任务" })
- **THEN** 返回 { success: true, output: {...}, durationMs: 12345 }

#### Scenario: 调用超时
- **WHEN** Agent 在 timeout 内未返回
- **THEN** 返回 { success: false, error: "timeout" }，记录 agent_failed 事件

### Requirement: Agent 活动描述更新

`activity.ts` 的 `updateActivity()` SHALL 更新 agents 表的 status、activity、activity_detail 字段。

#### Scenario: 调用前更新
- **WHEN** 编排层准备调用游商
- **THEN** agents.status 更新为 "working"，activity 更新为"正在为「极简记账」采风"

#### Scenario: 调用后更新
- **WHEN** 游商完成采风
- **THEN** agents.status 更新为 "idle"，activity 更新为"在坊间闲逛"
