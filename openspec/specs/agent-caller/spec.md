## ADDED Requirements

### Requirement: Agent 异步分发

`packages/domain/src/agents/caller.ts` 的 `callAgent()` SHALL 通过 `gateway-client.dispatchAgentTask()` 创建 cron one-shot isolated job 给目标 Agent。**不同步等待 Agent 完成**。

1. 调用 `dispatchAgentTask(agentId, message, opts?)` 创建 job
2. 记录 `agent_dispatched` 事件（含 jobId、agentId、message）
3. 返回 `{ dispatched: true, jobId }`

Agent 产出通过 tool call（submit_scout_report 等）写入 DB。编排层下次 tick 检测 DB 状态来判断 Agent 是否已完成。

#### Scenario: 分发采风任务
- **WHEN** callAgent({ agentId: "youshang", message: "为「极简记账」采风" })
- **THEN** cron one-shot job 已创建，events 表有 agent_dispatched 记录

#### Scenario: 检测 Agent 完成
- **WHEN** 下次 tick 检查 phase.output 不为空
- **THEN** 视为 Agent 已完成，进入决策流程

#### Scenario: 检测 Agent 超时
- **WHEN** 下次 tick 检查 phase.output 为空且距 agent_dispatched 超过 stale 阈值（`getCronInterval(phase.type) × STALE_MULTIPLIER`）
- **THEN** 判定为 stale / failed，进入自愈流程

### Requirement: Gateway Client 封装

`packages/openclaw/src/gateway-client.ts` SHALL 封装 cron job 管理：

- `dispatchAgentTask(agentId, message, opts?)` — 创建 one-shot isolated cron job（`schedule.kind = "at", sessionTarget = "isolated", agentId`）
- `getJobStatus(jobId)` — 查询 job 运行状态和结果
- `checkProviderHealth()` — 轻量 LLM provider 健康检查

通过 `OPENCLAW_GATEWAY_HOST` + `OPENCLAW_GATEWAY_PORT` 环境变量配置。

#### Scenario: 创建 one-shot job
- **WHEN** dispatchAgentTask("youshang", "采风任务")
- **THEN** 调用 openclaw cron API 创建 at-schedule isolated job，绑定 agent youshang

### Requirement: Agent 活动描述更新

`activity.ts` 的 `updateActivity()` SHALL 更新 agents 表的 status、activity、activity_detail 字段。

#### Scenario: 分发前更新
- **WHEN** 编排层准备调用游商
- **THEN** agents.status 更新为 "working"，activity 更新为"正在为「极简记账」采风"

#### Scenario: 阶段完成后更新
- **WHEN** 采风阶段完成
- **THEN** agents.status 更新为 "idle"，activity 更新为"在坊间闲逛"
