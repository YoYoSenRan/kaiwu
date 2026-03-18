## Why

鸣锣是造物流的最后一步——器物部署上线，造物流完整闭环。同时上线复盘机制和属性计算，让 Agent 从实战中成长。

需求来源：`design/施工/12-鸣锣部署/README.md`

依赖的前置模块：`s11-build-pipeline`（试剑通过后触发鸣锣）

## What Changes

- 填充 deployer.ts（鸣锣阶段处理器）
- 实现复盘逻辑（7/30/90 天触发）
- 填充属性计算（stats.ts 骨架 → 实际公式）
- 实现功勋榜和轶事检查
- 精调鸣锣 SOUL.md
- 展示网站补充器物坊 + 造物志终章 + 复盘志

## Capabilities

### New Capabilities

- `deployer-phase`: 鸣锣阶段处理器（部署 + 冒烟测试 + 回滚）
- `retrospective`: 复盘逻辑（7/30/90 天触发 + 数据收集 + 属性更新）
- `agent-stats-calc`: 属性计算完整公式
- `achievements`: 功勋榜聚合 + 轶事解锁检查 + 宿敌谱更新

### Modified Capabilities

（无）

## Impact

- 修改 deployer.ts（骨架 → 实际逻辑）
- 新增 retrospective.ts
- 修改 stats.ts（骨架 → 完整公式）
- 修改鸣锣 SOUL.md
- 新增展示网站器物坊组件 + 造物志终章 + 复盘志页面
