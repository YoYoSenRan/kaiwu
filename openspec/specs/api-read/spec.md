## ADDED Requirements

### Requirement: Agent 列表接口

`GET /api/pipeline/agents` SHALL 返回所有 Agent 的基本信息和当前状态。

#### Scenario: 获取全部 Agent
- **WHEN** 请求 `GET /api/pipeline/agents`
- **THEN** 返回 8 个 Agent，每个包含 id、name、title、emoji、status、activity、level、levelName

### Requirement: Agent 属性接口

`GET /api/pipeline/agents/:agentId/stats` SHALL 返回指定 Agent 的属性面板。

#### Scenario: 获取有效 Agent 属性
- **WHEN** 请求 `GET /api/pipeline/agents/youshang/stats`
- **THEN** 返回 agentId、level、levelName、stats 数组（含 key、starLevel、rawValue、sampleSize）

#### Scenario: Agent 不存在
- **WHEN** 请求 `GET /api/pipeline/agents/nonexistent/stats`
- **THEN** 返回 404

### Requirement: 项目上下文接口

`GET /api/pipeline/projects/:projectId/context` SHALL 返回项目详情及所有上游阶段产出。

#### Scenario: 获取项目上下文
- **WHEN** 请求有效的 projectId
- **THEN** 返回 project 基本信息、upstreamOutputs（各阶段 output）、currentPhase 详情

### Requirement: 辩论记录接口

`GET /api/pipeline/phases/:phaseId/debates` SHALL 返回指定阶段的辩论记录，按 round + created_at 排序。

#### Scenario: 获取辩论记录
- **WHEN** 请求有效的 phaseId
- **THEN** 返回 debates 数组，按轮次和时间排序

### Requirement: 任务列表接口

`GET /api/pipeline/projects/:projectId/tasks` SHALL 返回项目的任务列表，支持 assignedTo 和 status 筛选。

#### Scenario: 按 Agent 筛选任务
- **WHEN** 请求 `GET /api/pipeline/projects/:id/tasks?assignedTo=jiangren&status=pending`
- **THEN** 只返回匠人的待办任务

### Requirement: 当前造物令接口

`GET /api/pipeline/projects` SHALL 返回当前 running 的造物令（status 非 launched/dead）。

#### Scenario: 有进行中的造物令
- **WHEN** 存在 status=scouting 的造物令
- **THEN** 返回该造物令的基本信息

### Requirement: Agent 状态字段

`GET /api/pipeline/agents` 返回的每个 Agent SHALL 包含 status 字段，反映 Agent 当前的工作状态。

#### Scenario: Agent 空闲
- **WHEN** Agent 没有正在处理的阶段
- **THEN** status 为 "idle"

#### Scenario: Agent 工作中
- **WHEN** Agent 正在处理某个阶段
- **THEN** status 为 "working"，activity 字段描述当前工作内容
