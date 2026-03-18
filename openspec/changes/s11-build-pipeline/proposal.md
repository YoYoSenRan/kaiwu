## Why

绘图、锻造、试剑是造物流的核心产出阶段——画师出蓝图，匠人写代码，试剑验质量。完成后器物（前端展示页面）可以被造出来。

需求来源：`design/施工/11-绘图锻造试剑/README.md`

依赖的前置模块：`s08-council`（过堂通过后触发绘图）、`s02-openclaw-integration`（画师/匠人/试剑 workspace）

## What Changes

- 填充 architect.ts / builder.ts / inspector.ts 三个阶段处理器
- 新增产出目录管理（product-dir.ts）
- 精调画师/匠人/试剑 SOUL.md
- 实现造物坊页面（看板 + 漏斗 + 更鼓时间线）
- 造物志补充绘图/锻造/试剑章节

## Capabilities

### New Capabilities

- `architect-phase`: 绘图阶段处理器（调用画师 → 解析蓝图 → 拆任务 → 创建产出目录）
- `builder-phase`: 锻造阶段处理器（分步调度 + 匠人子角色并行 + 试剑轻检）
- `inspector-phase`: 试剑阶段处理器（全检 + 回炉机制）
- `product-dir`: 产出目录管理（创建/初始化项目目录）
- `pipeline-page`: 造物坊页面（看板 + 漏斗 + 更鼓时间线）

### Modified Capabilities

（无）

## Impact

- 修改 3 个阶段处理器（骨架 → 实际逻辑）
- 新增 product-dir.ts
- 修改画师/匠人/试剑 SOUL.md
- 新增造物坊页面组件
- 修改造物志详情页（填充绘图/锻造/试剑章节）
