## ADDED Requirements

### Requirement: 提交阶段产出

`POST /api/pipeline/phases/:phaseId/output` SHALL 接受阶段产出并写入 phases.output。

请求 MUST 包含 X-Agent-Id header。请求体 MUST 通过对应阶段的 Zod schema 校验。

#### Scenario: 提交采风报告
- **WHEN** 游商提交合法的采风报告 JSON
- **THEN** phases.output 被更新，返回 `{ success: true }`

#### Scenario: 非法请求体
- **WHEN** 请求体缺少必填字段
- **THEN** 返回 400，包含 Zod 校验错误详情

#### Scenario: 重复提交
- **WHEN** 同一阶段已有 output，再次提交
- **THEN** 返回 409 Conflict

### Requirement: 提交辩论发言

`POST /api/pipeline/phases/:phaseId/debates` SHALL 写入辩论记录。

请求体 MUST 包含 round、stance、content、citations、keyPoint。

#### Scenario: 提交发言成功
- **WHEN** 说客提交合法的辩论发言
- **THEN** debates 表新增一条记录，返回 `{ success: true, debateId }`

### Requirement: 提交任务完成

`POST /api/pipeline/tasks/:taskId/complete` SHALL 更新任务状态为 completed。

#### Scenario: 完成任务
- **WHEN** 匠人提交任务完成报告
- **THEN** tasks 表 status 更新为 completed，result 写入，completed_at 设置

### Requirement: 写入 Agent 日志

`POST /api/pipeline/agents/:agentId/logs` SHALL 写入 agent_logs 表。

请求体 MUST 包含 projectId、phaseId、type、content、visibility。

#### Scenario: 写入思考日志
- **WHEN** Agent 提交 type=thought 的日志
- **THEN** agent_logs 表新增一条记录

### Requirement: 所有写入接口 Zod 校验

所有写入接口 SHALL 使用 Zod schema 校验请求体，非法请求返回 400。

#### Scenario: 缺少必填字段
- **WHEN** 请求体缺少 Zod schema 中的 required 字段
- **THEN** 返回 400，body 包含具体的校验错误信息
