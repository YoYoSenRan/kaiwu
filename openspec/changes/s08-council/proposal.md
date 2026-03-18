## Why

过堂是开物局的核心看点——说客和诤臣的多轮辩论，掌秤最终裁决。这是展示网站最有戏剧性的内容，也是验证 Agent 多角色协作的关键阶段。

需求来源：`design/施工/08-过堂辩论/README.md`

依赖的前置模块：`s07-scout`（采风报告作为过堂输入）、`s02-openclaw-integration`（说客/诤臣/掌秤 workspace）

## What Changes

- 填充 `packages/domain/src/pipeline/phases/council.ts`（过堂阶段处理器）
- 新增 `packages/domain/src/pipeline/situation.ts`（局势条计算）
- 精调说客/诤臣/掌秤 SOUL.md
- 实现局中人总览页和详情页
- 实现过堂直播组件

## Capabilities

### New Capabilities

- `council-phase`: 过堂阶段处理器（说客→诤臣串行辩论 + 掌秤裁决 + 局势条）
- `agents-pages`: 局中人总览页（卡片网格 + 关系图谱）+ 详情页（属性雷达图 + 战绩 + 名场面）
- `debate-live`: 过堂直播组件（实时气泡 + 局势条 + 裁决样式）

### Modified Capabilities

（无）

## Impact

- 修改 `packages/domain/src/pipeline/phases/council.ts`（骨架 → 实际逻辑）
- 新增 `packages/domain/src/pipeline/situation.ts`
- 修改说客/诤臣/掌秤 SOUL.md（精调）
- 新增 `apps/site/src/app/agents/` 下多个组件
- 修改 agents 页面（占位 → 实际内容）
