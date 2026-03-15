# 数据库设计文档

> Kaiwu 内容生产流水线 — PostgreSQL + Drizzle ORM

## 目录结构

```
docs/db/
├── README.md                  ← 你在这里
├── overview/
│   ├── architecture.md        ← 整体架构与设计原则
│   └── entity-relationship.md ← 表关系总览图
├── tables/
│   ├── 01-users.md            ← 身份：用户
│   ├── 02-sessions.md         ← 身份：登录会话
│   ├── 03-themes.md           ← 主题：主题定义
│   ├── 04-pipelines.md        ← 主题：流水线阶段
│   ├── 05-agents.md           ← Agent：角色定义
│   ├── 07-proposals.md        ← 内容：选题/灵感
│   ├── 08-productions.md      ← 内容：正式作品
│   ├── 09-production-stages.md← 内容：流转审计
│   ├── 10-production-tasks.md ← 内容：实施子任务
│   ├── 11-publications.md     ← 发布：发布记录
│   ├── 12-production-events.md← 可观测：事件流
│   └── 13-settings.md         ← 系统：键值配置
├── pipeline/
│   └── lifecycle.md           ← 内容生命周期与状态机
└── theme/
    └── theme-system.md        ← 主题系统设计与换肤机制
```

## 快速概览

| 分组   | 表                                                               | 核心职责                               |
| ------ | ---------------------------------------------------------------- | -------------------------------------- |
| 身份   | `users` `sessions`                                               | Console 登录与会话管理                 |
| 主题   | `themes` `pipelines`                                             | 可替换的叙事皮肤 + 流水线阶段定义      |
| Agent  | `agents`                                                         | 角色定义（模型配置读 OpenClaw 运行时） |
| 内容   | `proposals` `productions` `production_stages` `production_tasks` | 从选题到实施的完整流水线               |
| 发布   | `publications`                                                   | 自动部署发布的全过程追踪               |
| 可观测 | `production_events`                                              | 全量事件记录，支持时间线回放           |
| 系统   | `settings`                                                       | 键值配置                               |

## 技术栈

- **数据库**: PostgreSQL 16+
- **ORM**: Drizzle ORM（TypeScript，与 Next.js 深度集成）
- **迁移**: drizzle-kit（generate + migrate）
- **包路径**: `packages/db/src/schema/`
