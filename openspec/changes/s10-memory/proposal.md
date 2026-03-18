## Why

Agent 需要从实战中积累经验——采风判断是否准确、辩论策略是否有效、锻造质量是否提升。记忆系统让 Agent 越来越"聪明"，也让展示网站上的角色有真实的成长弧线。

需求来源：`design/施工/10-记忆系统/README.md`

依赖的前置模块：`s04-orchestrator`（造物令完成的钩子）、`s02-openclaw-integration`（workspace 记忆文件结构）

## What Changes

- 实现经验提炼器（造物令完成时从各阶段产出提炼经验）
- 实现每日总结逻辑（Cron #3 触发）
- 实现 MEMORY.md 精炼（复盘时从第二层提炼到第三层）
- 实现记忆文件写入器

## Capabilities

### New Capabilities

- `memory-extractor`: 经验提炼器（造物令完成 → LLM 生成经验条目 → 写入记忆文件）
- `memory-daily`: 每日总结（Cron #3 → 查询今日数据 → 生成摘要 → 写入 memory/）
- `memory-refiner`: MEMORY.md 精炼（重要度 ≥4 的条目压缩写入 MEMORY.md，200 行上限）

### Modified Capabilities

（无）

## Impact

- 新增 `packages/domain/src/memory/` 下 4 个文件
- 修改编排层的造物令完成钩子（接入 extractExperience）
- 运行时修改 Agent workspace 的 memory/ 目录和 MEMORY.md
