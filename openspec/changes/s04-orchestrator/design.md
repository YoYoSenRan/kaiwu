## Context

数据库和 API 层已就位，OpenClaw Gateway 已配置。本阶段实现造物流的核心引擎，让更鼓 Cron 触发时可以自动推进造物令。

编排层设计已在 `design/流水线设计.md → 编排层详细设计` 中完整定义，包括 tick 流程、调度策略、自愈机制、追溯事件。

## Goals / Non-Goals

**Goals:**

- tick() 可手动调用，正确检测造物令状态并推进
- 阶段流转事务正确（phases + projects 状态一致）
- 四级自愈逻辑正确（L1 重试 → L2 调整 → L3 降速 → L4 暂停）
- 所有追溯事件正确写入 events 表
- Agent 调用封装可通过 Gateway API 创建 isolated session

**Non-Goals:**

- 各阶段处理器只实现骨架（mock），具体逻辑在后续模块填充（s07-游商采风、s08-过堂辩论等）
- 不实现复盘触发（属于 s12-鸣锣部署）
- 不实现属性计算的完整公式（属于后续模块，本阶段只搭框架）

## Decisions

### D1: 自建轻量状态机

设计文档指定。阶段数固定（6 个），不需要动态编排。自建比引入重型工作流引擎更灵活。

### D2: 阶段处理器统一接口

所有阶段实现 `PhaseHandler.advance(project, phase): PhaseStepResult`。本阶段只实现骨架返回 mock，后续模块逐个填充。这样编排层骨架可以独立验证。

### D3: 任务指令通过 Gateway API 会话消息传递

不写 HEARTBEAT.md。编排层通过 Gateway API 创建 isolated session 并直接传入任务消息。HEARTBEAT.md 仅保留为 Agent 的行为规则参考文档。

### D4: EventBus 在 packages/domain

EventBus（bus.ts + emitter.ts）已在 s03 中定义于 `packages/domain/src/events/`。编排层直接使用 emitEvent() 写入事件。

### D5: 单造物令排队

同一时间只有一个造物令在跑。设计文档明确了这个策略及其理由（注意力集中、叙事线清晰、零并发风险）。

## Risks / Trade-offs

- **骨架阶段处理器**：返回 mock 数据，无法端到端验证。→ 通过单元测试验证 tick 流程和状态流转逻辑，具体 Agent 交互在后续模块集成测试。
- **Gateway API 可用性**：Gateway 挂了 tick 会失败。→ tick 开头检查 Gateway 健康，不健康时记录 gateway_down 事件并跳过。
- **72 小时超时**：单造物令超时自动封存。→ 在 tick 中检查 started_at，超时则走封存流程。
