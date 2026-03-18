## Why

造物流的所有数据（物帖、造物令、过堂记录、Agent 状态、事件流等）都需要持久化存储。数据库是整个系统的数据基座，API 层、编排层、展示网站都依赖它。没有 schema 定义，后续模块无法开工。

需求来源：`design/施工/01-数据库/README.md`

依赖的前置模块：`project-init`（需要 packages/db 骨架已就位）

## What Changes

- 在 `packages/db` 中安装 Drizzle ORM 及相关依赖
- 定义 13 张表的 Drizzle schema（users、keywords、votes、projects、phases、debates、tasks、agents、agent_stats、agent_logs、products、retrospectives、events）
- 定义状态枚举和事件类型常量（enums.ts）
- 创建数据库连接实例（client.ts）
- 生成并执行数据库迁移
- 编写种子数据脚本（8 个局中人 + 初始属性）
- 配置所有索引

## Capabilities

### New Capabilities

- `db-schema`: 13 张表的 Drizzle ORM schema 定义、索引、外键关系
- `db-enums`: 状态枚举和事件类型常量（PROJECT_STATUS、PHASE_TYPE、AGENT_STATUS、EVENT_TYPE 等）
- `db-seed`: 8 个局中人的初始数据（agents 表 + agent_stats 表）

### Modified Capabilities

（无）

## Impact

- 修改 `packages/db/package.json`：新增 drizzle-orm、drizzle-kit、postgres driver 依赖
- 新增 `packages/db/src/schema/` 下 13 个 schema 文件 + barrel 导出
- 新增 `packages/db/src/enums.ts`、`client.ts`、`seed.ts`
- 新增 `packages/db/drizzle.config.ts`
- 新增 `packages/db/drizzle/` 迁移目录
- 需要 PostgreSQL 实例（Supabase / Neon / 本地）和 DATABASE_URL 环境变量
