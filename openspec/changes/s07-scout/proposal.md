## Why

游商采风是造物流的第一个 Agent 阶段。物帖进入造物流后，游商负责把简短的关键词扩展成完整的项目背景书并评分。这是验证整条 Agent 调用链路（编排层 → Gateway → Agent → tool → 数据库）的第一次端到端测试。

需求来源：`design/施工/07-游商采风/README.md`

依赖的前置模块：`s02-openclaw-integration`（游商 workspace）、`s04-orchestrator`（tick + 阶段流转）

## What Changes

- 填充 `packages/domain/src/pipeline/phases/scout.ts`（从骨架变为实际逻辑）
- 精调游商 SOUL.md prompt
- 实现首页开物局全景（静态 SVG）和群聊记录组件
- 端到端验证：物帖 → 采风 → 评分 → 决策

## Capabilities

### New Capabilities

- `scout-phase`: 采风阶段处理器（调用游商 → 解析报告 → 自动决策 → 封存辞生成）
- `home-panorama`: 首页开物局全景（静态 SVG + 8 个局中人状态）
- `home-chat-feed`: 首页群聊记录（agent_logs + debates + events 聚合 + SSE 实时追加）

### Modified Capabilities

（无）

## Impact

- 修改 `packages/domain/src/pipeline/phases/scout.ts`（骨架 → 实际逻辑）
- 可能修改游商 SOUL.md（精调）
- 新增首页组件（Panorama、ChatFeed、AgentBubble）
- 修改 `apps/site/src/app/(home)/page.tsx`（占位 → 实际内容）
