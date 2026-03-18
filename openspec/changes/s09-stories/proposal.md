## Why

造物志是开物局的内容核心——每个造物令从物帖到器物（或封存）的完整故事。没有造物志，展示网站就只有实时数据，缺少可回顾的叙事内容。

需求来源：`design/施工/09-造物志/README.md`

依赖的前置模块：`s05-site-skeleton`（页面框架）、`s08-council`（至少有几个造物令的数据）

## What Changes

- 实现造物志列表页（卡片墙 + 筛选 + 进度条）
- 实现造物志详情页（章节式叙事：采风 + 过堂 + 后续占位）
- 实现对话流页面（按时间排序的群聊记录 + SSE 实时追加）
- 实现封存辞页面

## Capabilities

### New Capabilities

- `story-list`: 造物志列表页（卡片墙 + 筛选 + 进度条）
- `story-detail`: 造物志详情页（章节式叙事 + 封存辞）
- `story-flow`: 对话流页面（agent_logs + debates + events 聚合 + 筛选 + SSE）

### Modified Capabilities

（无）

## Impact

- 修改 `apps/site/src/app/stories/` 下所有页面（占位 → 实际内容）
- 新增约 15 个组件文件
- 依赖 projects + phases + debates + agent_logs + events 表数据
