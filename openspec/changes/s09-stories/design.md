## Context

过堂阶段已跑通（s08），数据库中有造物令数据。本阶段把这些数据组织成可浏览的故事。

## Goals / Non-Goals

**Goals:**

- 造物志列表正确展示所有造物令
- 详情页章节式叙事流畅
- 对话流按真实时间排序
- 封存辞有仪式感

**Non-Goals:**

- 绘图/锻造/试剑/鸣锣章节先占位（s11/s12 填充）
- 不做社交分享功能（属于打磨阶段）

## Decisions

### D1: 章节组件独立

每个阶段的章节是独立组件（ChapterScout、ChapterCouncil 等），后续模块只需填充对应组件，不改详情页结构。

### D2: 对话流聚合查询

从 agent_logs（visibility: public）+ debates + events 三张表 UNION 查询，按 created_at 排序。用 type 字段区分消息类型。

## Risks / Trade-offs

- **数据量增长**：对话流可能很长。→ 分页加载，每次 50 条。
