## ADDED Requirements

### Requirement: 通用读取 Tool

以下 Tool SHALL 可被所有 Agent 调用：
- `getMyStats`：读取自己的属性面板（调用 GET /agents/:id/stats）
- `getProjectContext`：读取当前项目上下文（调用 GET /projects/:id/context）
- `writeLog`：写入思考/行动日志（调用 POST /agents/:id/logs）

#### Scenario: Agent 调用 getMyStats
- **WHEN** Agent 在 session 中调用 `useTool("getMyStats")`
- **THEN** 返回该 Agent 的属性数据，格式与 API 响应一致

### Requirement: getMyMemories 走 OpenClaw 原生

`getMyMemories` Tool SHALL 调用 OpenClaw Gateway 的 memory_search API，不经过自建 Route Handler。

#### Scenario: Agent 调用 getMyMemories
- **WHEN** Agent 调用 `useTool("getMyMemories", { type: "lesson" })`
- **THEN** 通过 OpenClaw memory_search 返回记忆列表

### Requirement: 角色专属 Tool

以下角色专属 Tool SHALL 封装对应的写入接口：
- `submitOutput`：通用阶段产出提交（游商/画师/试剑/鸣锣共用）
- `submitDebateSpeech`：辩论发言提交（说客/诤臣共用）
- `getDebateHistory`：辩论记录读取（说客/诤臣/掌秤共用）
- `getMyTasks`：任务列表读取（匠人用）
- `completeTask`：任务完成提交（匠人用）

#### Scenario: 游商提交采风报告
- **WHEN** 游商调用 `useTool("submitOutput", { report })`
- **THEN** 采风报告写入 phases.output

#### Scenario: 说客提交辩论发言
- **WHEN** 说客调用 `useTool("submitDebateSpeech", { round, content, ... })`
- **THEN** 辩论记录写入 debates 表

### Requirement: Tool barrel 导出

`packages/openclaw/src/tools/index.ts` SHALL 导出所有 9 个 Tool。

#### Scenario: 导入所有 Tool
- **WHEN** `import { getMyStats, submitOutput, ... } from "@kaiwu/openclaw/tools"`
- **THEN** 所有 9 个 Tool 可用
