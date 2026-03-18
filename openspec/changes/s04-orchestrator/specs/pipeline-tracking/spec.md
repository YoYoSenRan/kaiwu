## ADDED Requirements

### Requirement: 追溯事件记录

`tracking.ts` SHALL 在以下关键动作时写入 events 表：
- `tick_executed`：每次 tick 的摘要（projectId、action、duration）
- `phase_transition`：阶段流转（from、to、decision 依据）
- `agent_dispatched`：Agent 任务分发（agentId、jobId、message）— 异步模型，不含 durationMs
- `agent_completed`：Agent 产出已写入 DB（agentId、phaseId）— 由 tick 检测到产出时记录
- `agent_failed`：Agent 失败/超时（error、failCount、recoveryLevel）
- `agent_retried`：Agent 重试（attempt、adjustment）
- `backoff_triggered`：降速触发（fromInterval、toInterval）
- `backoff_recovered`：降速恢复
- `project_blocked`：造物令暂停（L4）
- `provider_down` / `provider_recovered`：LLM provider 状态变化（不是 Gateway）

#### Scenario: tick 事件记录
- **WHEN** tick() 执行完成
- **THEN** events 表新增一条 type=tick_executed 的记录，detail 含 projectId 和 action

#### Scenario: Agent 分发事件
- **WHEN** tick() 通过 callAgent() 分发任务给游商
- **THEN** events 表新增一条 type=agent_dispatched 的记录，detail 含 agentId="youshang"、jobId

#### Scenario: Agent 完成事件
- **WHEN** tick() 检测到 phase.output 已有值
- **THEN** events 表新增一条 type=agent_completed 的记录，detail 含 agentId、phaseId

#### Scenario: 阶段流转事件
- **WHEN** 造物令从 scout 进入 council
- **THEN** events 表新增一条 type=phase_transition 的记录，detail 含 from="scout"、to="council"
