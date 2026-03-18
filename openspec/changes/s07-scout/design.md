## Context

编排层骨架已就位（s04），游商 workspace 已部署（s02）。本阶段让第一个 Agent 真正跑起来，验证整条链路。

采风流程已在 `design/流水线设计.md → Phase 1 采风` 中完整定义。

## Goals / Non-Goals

**Goals:**

- 游商可被编排层调用，产出格式正确的采风报告
- 采风报告包含完整项目背景（定位、用户、痛点、形态、功能、差异化）+ 四维度评分
- 自动决策正确（≥60 进过堂，<60 封存 + 封存辞）
- 首页有基本的全景图和群聊记录

**Non-Goals:**

- 不追求采风报告的完美质量（后续持续精调 prompt）
- 首页全景不做微动画（属于打磨阶段）
- 不实现游商自由活动（属于打磨阶段）

## Decisions

### D1: 采风一次完成（异步状态机下的含义）

设计文档说采风可以分步（每次更鼓一个维度），MVP 简化为"一次 agent turn 完成"。

在 s04 异步状态机模型下，"一次完成"意味着：
- 游商在一次 isolated session 内完成所有调研，通过 `submit_scout_report` tool 将报告写入 `phases.output`
- 编排层 `advance()` 不等 Agent——首次检查 output 为空时分发任务（`in_progress`），下次 tick 检查 output 有值时校验并流转（`completed`）
- 所以采风需要 **2 次 tick**：分发 + 收结果

```
tick N:   phase.output 为空 → callAgent("youshang", 采风消息) → in_progress
          （游商在 isolated session 中调研 → submit_scout_report 写入 output）
tick N+1: phase.output 有值 → Zod 校验 → decideAfterScout → advance/seal
```

### D2: 封存辞用编排层模板（与 s04 D11 一致）

~~原方案：额外调用游商生成封存辞。~~

修正：异步模型下 tick 不等 Agent，无法"额外调一次"。封存辞用编排层模板：`"市场尚未准备好。也许换个时机。"`。

如果采风报告中有 `privateNote` 字段，可以拼接到封存辞后面，增加个性化——但不额外发起 Agent 调用。

### D3: 依赖 s05 展示网站骨架

首页全景（tasks 4 组）和群聊记录（tasks 5 组）需要 `apps/site/src/app/(home)/page.tsx` 存在。此文件由 s05 创建。

如果 s05 未完成，4-5 组任务延后。采风核心逻辑（1-3 组）不依赖 s05，可独立完成。

## Risks / Trade-offs

- **采风需要 2 次 tick**：分发 + 收结果，间隔约 10-20 分钟。→ 可接受，对展示网站来说有"游商正在采风"的过程感。
- **prompt 质量**：游商的采风质量高度依赖 SOUL.md prompt。→ 手动测试 5-10 次，迭代精调。
- **首页组件依赖 s05**：如果 s05 延后，首页部分无法交付。→ 采风核心逻辑不受影响。
