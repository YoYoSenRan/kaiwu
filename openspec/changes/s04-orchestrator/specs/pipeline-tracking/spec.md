## ADDED Requirements

### Requirement: 追溯事件记录

`tracking.ts` SHALL 在以下关键动作时写入 events 表：
- `tick_executed`：每次 tick 的摘要（projectId、action、duration）
- `phase_transition`：阶段流转（from、to、decision 依据）
- `agent_called`：Agent 调用（agentId、message、durationMs）
- `agent_failed`：Agent 失败（error、failCount、recoveryLevel）
- `agent_retried`：Agent 重试（attempt、adjustment）
- `backoff_triggered`：降速触发（fromInterval、toInterval）
- `backoff_recovered`：降速恢复
- `project_blocked`：造物令暂停（L4）
- `gateway_down` / `gateway_recovered`：Gateway 状态变化

#### Scenario: tick 事件记录
- **WHEN** tick() 执行完成
- **THEN** events 表新增一条 type=tick_executed 的记录，detail 含 projectId 和 action

#### Scenario: 阶段流转事件
- **WHEN** 造物令从 scout 进入 council
- **THEN** events 表新增一条 type=phase_transition 的记录，detail 含 from="scout"、to="council"
