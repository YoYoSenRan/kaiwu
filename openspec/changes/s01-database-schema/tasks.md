## 1. 依赖安装与配置

- [x] 1.1 更新 `packages/db/package.json`：添加 drizzle-orm、drizzle-kit、postgres driver 依赖 — 验收：pnpm install 成功
- [x] 1.2 创建 `packages/db/drizzle.config.ts`：配置数据库连接（读 DATABASE_URL）— 验收：drizzle-kit 可识别配置
- [x] 1.3 更新 `packages/db/tsconfig.json`：确保 src/ 下文件可编译 — 验收：typecheck 通过

## 2. 枚举常量

- [x] 2.1 创建 `packages/db/src/enums.ts`：定义 PROJECT_STATUS、PHASE_TYPE、PHASE_STATUS、AGENT_STATUS、EVENT_TYPE、KEYWORD_STATUS、TASK_STATUS、VOTE_STANCE、LOG_TYPE、LOG_VISIBILITY — 验收：所有枚举值与数据模型.md 一致，typecheck 通过

## 3. Schema 定义（按外键依赖顺序）

- [x] 3.1 创建 `packages/db/src/schema/users.ts` — 验收：字段与数据模型.md 一致
- [x] 3.2 创建 `packages/db/src/schema/agents.ts`（VARCHAR 主键）— 验收：字段与数据模型.md 一致
- [x] 3.3 创建 `packages/db/src/schema/keywords.ts`（FK → users）— 验收：字段与数据模型.md 一致
- [x] 3.4 创建 `packages/db/src/schema/votes.ts`（FK → users, keywords + UNIQUE 约束）— 验收：字段与数据模型.md 一致
- [x] 3.5 创建 `packages/db/src/schema/projects.ts`（FK → keywords）— 验收：字段与数据模型.md 一致
- [x] 3.6 创建 `packages/db/src/schema/phases.ts`（FK → projects）— 验收：字段与数据模型.md 一致
- [x] 3.7 创建 `packages/db/src/schema/debates.ts`（FK → phases, agents）— 验收：字段与数据模型.md 一致
- [x] 3.8 创建 `packages/db/src/schema/tasks.ts`（FK → projects, phases, agents）— 验收：字段与数据模型.md 一致
- [x] 3.9 创建 `packages/db/src/schema/agent-stats.ts`（FK → agents + UNIQUE 约束）— 验收：字段与数据模型.md 一致
- [x] 3.10 创建 `packages/db/src/schema/agent-logs.ts`（FK → agents, projects, phases, tasks）— 验收：字段与数据模型.md 一致
- [x] 3.11 创建 `packages/db/src/schema/products.ts`（FK → projects）— 验收：字段与数据模型.md 一致
- [x] 3.12 创建 `packages/db/src/schema/retrospectives.ts`（FK → projects）— 验收：字段与数据模型.md 一致
- [x] 3.13 创建 `packages/db/src/schema/events.ts`（FK → projects, phases, agents）— 验收：字段与数据模型.md 一致
- [x] 3.14 创建 `packages/db/src/schema/index.ts`：barrel 导出所有 13 张表 — 验收：import * 可用

## 4. 数据库连接

- [x] 4.1 创建 `packages/db/src/client.ts`：Drizzle 数据库实例，读 DATABASE_URL — 验收：连接有效 PostgreSQL 后可执行查询

## 5. 迁移

- [x] 5.1 执行 `drizzle-kit generate` 生成迁移文件 — 验收：drizzle/ 目录下有 SQL 文件
- [x] 5.2 执行 `drizzle-kit migrate` 创建表 — 验收：数据库中 13 张表全部存在

## 6. 种子数据

- [x] 6.1 创建 `packages/db/src/seed.ts`：8 个局中人数据（agents 表）— 验收：执行后 agents 表有 8 条记录
- [x] 6.2 在 seed.ts 中添加初始属性数据（agent_stats 表，8×4=32 条）— 验收：执行后 agent_stats 表有 32 条记录
- [x] 6.3 确保 seed 脚本幂等（upsert）— 验收：重复执行不报错、不重复

## 7. 导出与验证

- [x] 7.1 更新 `packages/db/src/index.ts`：导出 db、所有 schema、所有 enums — 验收：外部 package 可 import
- [x] 7.2 执行 `pnpm typecheck` 全部通过 — 验收：无类型错误
