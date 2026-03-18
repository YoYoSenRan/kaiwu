## ADDED Requirements

### Requirement: 对话流

`/stories/:id/flow` 页面 SHALL 聚合 agent_logs + debates + events，按 created_at 排序展示。

#### Scenario: 消息类型区分
- **WHEN** 查看对话流
- **THEN** Agent 发言显示为角色气泡，系统事件（阶段转换、更鼓）显示为分隔线

#### Scenario: SSE 实时追加
- **WHEN** 造物令正在进行中
- **THEN** 新消息通过 SSE 实时追加到列表底部

#### Scenario: 筛选
- **WHEN** 选择"只看过堂"
- **THEN** 只显示 debates 相关的消息

### Requirement: 对话流分页加载

对话流 SHALL 支持分页加载，每次加载 50 条消息。

#### Scenario: 分页
- **WHEN** 对话流消息超过 50 条
- **THEN** 初始加载最新 50 条，滚动到顶部时加载更多历史消息
