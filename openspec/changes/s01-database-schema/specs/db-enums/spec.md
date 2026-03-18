## ADDED Requirements

### Requirement: 状态枚举常量完整

`packages/db/src/enums.ts` SHALL 导出以下枚举常量（均使用 `as const` 对象）：

- `PROJECT_STATUS`：scouting / debating / planning / building / inspecting / deploying / launched / dead
- `PHASE_TYPE`：scout / council / architect / builder / inspector / deployer
- `PHASE_STATUS`：pending / in_progress / completed / failed / stale / blocked / skipped
- `AGENT_STATUS`：idle / thinking / working / debating / blocked / done / error
- `EVENT_TYPE`：完整事件类型列表（约 30 种，见 `design/数据模型.md → 事件类型`）
- `KEYWORD_STATUS`：pending / queued / scouting / in_pipeline / completed / dead
- `TASK_STATUS`：pending / in_progress / completed / blocked / cancelled
- `VOTE_STANCE`：green / red
- `LOG_TYPE`：thought / action / decision / error
- `LOG_VISIBILITY`：public / internal

#### Scenario: 枚举值与数据模型一致
- **WHEN** 对比 enums.ts 与 `design/数据模型.md` 中的状态枚举
- **THEN** 每个枚举的值完全匹配

#### Scenario: 类型推导可用
- **WHEN** 使用 `typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]`
- **THEN** TypeScript 推导出联合类型 `"scouting" | "debating" | ... | "dead"`
