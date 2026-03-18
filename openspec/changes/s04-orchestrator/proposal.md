## Why

造物流需要一个引擎来驱动：每次更鼓响起时，检查当前造物令状态，调用对应 Agent，处理产出，决定下一步。没有编排层，Agent 只是静态的 workspace 文件，无法自动协作。

需求来源：`design/施工/04-编排层/README.md`

依赖的前置模块：`s01-database-schema`（表定义）、`s03-api-layer`（Agent 调用接口 + 事件写入）

## What Changes

- 在 `packages/domain/src/pipeline/` 下实现造物流引擎（tick 主循环、阶段调度、阶段流转、自动决策、四级自愈、指数退避、流程追溯）
- 在 `packages/domain/src/agents/` 下实现 Agent 调用封装、活动描述更新、属性计算
- 各阶段处理器只实现骨架（返回 mock），具体逻辑在后续模块填充

## Capabilities

### New Capabilities

- `pipeline-engine`: tick() 主循环 + 阶段调度器
- `phase-transitions`: 阶段流转（事务内状态变更 + 事件写入）+ 自动决策规则
- `pipeline-recovery`: 四级自愈（L1-L4）+ 指数退避
- `pipeline-tracking`: 流程追溯（tick_executed / agent_called / agent_failed / phase_transition 事件）
- `agent-caller`: Agent 调用封装（Gateway API → isolated session）+ 活动描述更新

### Modified Capabilities

（无）

## Impact

- 新增 `packages/domain/src/pipeline/` 下约 10 个文件
- 新增 `packages/domain/src/agents/` 下 3 个文件
- 依赖 `@kaiwu/db`（schema + db 实例）和 `@kaiwu/openclaw`（Gateway API）
- 更鼓 Cron 触发时调用 tick()，推进造物令
