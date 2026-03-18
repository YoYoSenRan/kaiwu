## Context

`packages/db` 骨架已由 project-init 创建（空的 package.json + tsconfig.json + src/index.ts）。本阶段填充实际内容：Drizzle ORM schema、迁移、种子数据。

数据模型已在 `design/数据模型.md` 中完整定义（13 张表、字段、类型、索引），本阶段严格按其实现，不做增减。

## Goals / Non-Goals

**Goals:**

- 13 张表的 Drizzle schema 与 `数据模型.md` 完全一致
- 所有索引按 `数据模型.md → 索引建议` 创建
- 8 个局中人初始数据可通过 seed 脚本写入
- 其他 package 可以 `import { db, users, projects } from "@kaiwu/db"` 使用

**Non-Goals:**

- 不实现查询逻辑（属于 API 层）
- 不实现迁移自动化 CI（属于打磨阶段）
- 不做数据库性能调优（先跑通）

## Decisions

### D1: ORM — Drizzle ORM

设计文档指定。类型安全、轻量、schema-first，与 TypeScript 配合好。不用 Prisma 是因为 Drizzle 更轻且支持更灵活的查询构建。

### D2: PostgreSQL Driver — @neondatabase/serverless 或 postgres

根据实际使用的 PostgreSQL 服务选择：Neon 用 @neondatabase/serverless，Supabase/本地用 postgres（node-postgres）。通过环境变量 DATABASE_URL 切换，client.ts 中统一封装。

### D3: 主键策略 — UUID（agents 表除外）

12 张表用 UUID 自动生成主键。agents 表用 VARCHAR 主键（youshang / shuike / ...），因为 Agent ID 是固定的、有语义的标识符。

### D4: schema 文件拆分 — 每表一个文件

13 张表拆成 13 个文件，通过 schema/index.ts barrel 导出。好处：单文件职责清晰，diff 友好，多人协作不冲突。

### D5: 枚举用 as const 对象

不用 TypeScript enum，用 `as const` 对象 + 类型推导。原因：tree-shakable、运行时可遍历、与 Drizzle 的 varchar 类型配合更自然。

## Risks / Trade-offs

- **数据模型变更**：后续施工中可能发现需要加字段。→ Drizzle 迁移支持增量变更，成本低。
- **seed 数据维护**：8 个局中人的人设数据分散在多个设计文档中。→ seed.ts 中集中管理，注释标注数据来源。
- **PostgreSQL 服务选择**：Neon 和 Supabase 的 driver 不同。→ client.ts 做一层薄封装，通过环境变量区分。
