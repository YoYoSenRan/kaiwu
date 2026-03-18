## ADDED Requirements

### Requirement: 群聊记录

首页 SHALL 展示群聊记录，从 agent_logs（visibility: public）+ debates + events 聚合，按 created_at 排序。

#### Scenario: 实时追加
- **WHEN** 游商采风过程中写入 agent_log
- **THEN** 群聊记录通过 SSE 实时追加新消息

#### Scenario: 筛选造物令
- **WHEN** 用户选择"只看某个造物令"
- **THEN** 只显示该造物令相关的消息

### Requirement: Agent 状态气泡

群聊记录中每条消息 SHALL 显示发言 Agent 的头像（emoji）、名称、角色标签。

#### Scenario: 消息格式
- **WHEN** 查看群聊中游商的一条消息
- **THEN** 显示 🎒 游商 · 采风使，消息内容，时间戳
