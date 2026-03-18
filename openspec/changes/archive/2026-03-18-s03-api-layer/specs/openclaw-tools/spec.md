## ADDED Requirements

### Requirement: 通用读取 Tool

以下 Tool SHALL 可被所有 Agent 调用：
- `get_my_stats`：读取自己的属性面板（调用 GET /agents/:id/stats）
- `get_project_context`：读取当前项目上下文（调用 GET /projects/:id/context）
- `write_log`：写入思考/行动日志（调用 POST /agents/:id/logs）

#### Scenario: Agent 调用 get_my_stats
- **WHEN** Agent 在 session 中调用 `useTool("get_my_stats")`
- **THEN** 返回该 Agent 的属性数据，格式与 API 响应一致

### Requirement: memory_search 为 OpenClaw 内置能力

`memory_search` 是 OpenClaw Gateway 的内置 Tool，不需要在 `@kaiwu/openclaw/tools` 中自行实现。Agent 通过 Gateway 原生的 memory_search 能力检索记忆，无需自建 Route Handler。

#### Scenario: Agent 检索记忆
- **WHEN** Agent 调用 `useTool("memory_search", { type: "lesson" })`
- **THEN** 通过 OpenClaw Gateway 内置 memory_search 返回记忆列表

### Requirement: 角色专属 Tool

以下角色专属 Tool SHALL 封装对应的写入接口：
- `submit_output`：阶段产出提交，按角色拆分为 5 个具名 Tool，各自拥有独立的 Zod schema：
  - `submit_scout_report`（游商）
  - `submit_verdict`（掌秤）
  - `submit_blueprint`（画师）
  - `submit_review`（试剑）
  - `submit_deploy_report`（鸣锣）
  底层 HTTP 调用仍为 POST /phases/:id/output。
- `submit_debate_speech`：辩论发言提交（说客/诤臣共用）
- `get_debate_history`：辩论记录读取（说客/诤臣/掌秤共用）
- `get_my_tasks`：任务列表读取（匠人用）
- `complete_task`：任务完成提交（匠人用）

#### Scenario: 游商提交采风报告
- **WHEN** 游商调用 `useTool("submit_scout_report", { report })`
- **THEN** 采风报告写入 phases.output

#### Scenario: 说客提交辩论发言
- **WHEN** 说客调用 `useTool("submit_debate_speech", { round, content, ... })`
- **THEN** 辩论记录写入 debates 表

### Requirement: Plugin 注册

角色专属 Tool SHALL 通过 `api.registerTool()` 注册到 OpenClaw Gateway，使 Agent 在 session 中可以调用。

#### Scenario: 注册自定义 Tool
- **WHEN** 调用 `api.registerTool(submit_scout_report)`
- **THEN** Gateway 将该 Tool 加入 Agent 可用工具列表

### Requirement: Tool barrel 导出

`packages/openclaw/src/tools/index.ts` SHALL 导出所有 8 个 Tool（memory_search 为 Gateway 内置，不计入）。

#### Scenario: 导入所有 Tool
- **WHEN** `import { get_my_stats, submit_scout_report, ... } from "@kaiwu/openclaw/tools"`
- **THEN** 所有 8 个 Tool 可用
