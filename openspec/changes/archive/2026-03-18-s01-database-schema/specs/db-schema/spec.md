## ADDED Requirements

### Requirement: 13 张表 schema 定义完整

`packages/db/src/schema/` SHALL 包含 13 个 schema 文件，每张表的字段、类型、默认值、外键、约束与 `design/数据模型.md` 完全一致。

表清单：users、keywords、votes、projects、phases、debates、tasks、agents、agent_stats、agent_logs、products、retrospectives、events。

#### Scenario: 所有表 schema 存在
- **WHEN** 检查 `packages/db/src/schema/` 目录
- **THEN** 存在 13 个 .ts 文件 + 1 个 index.ts barrel 导出

#### Scenario: 字段与数据模型一致
- **WHEN** 对比 schema 文件与 `design/数据模型.md` 中的表定义
- **THEN** 每张表的字段名、类型、默认值、nullable 完全匹配

### Requirement: 外键关系正确

所有表之间的外键关系 SHALL 按 `design/数据模型.md` 的实体关系图定义。

#### Scenario: 外键引用有效
- **WHEN** 执行数据库迁移
- **THEN** 所有外键约束创建成功，无引用错误

### Requirement: 索引按规范创建

所有索引 SHALL 按 `design/数据模型.md → 索引建议` 创建，包括唯一索引和普通索引。

#### Scenario: 索引存在
- **WHEN** 查询数据库索引列表
- **THEN** 包含数据模型中定义的所有索引（idx_users_github_id、idx_votes_user_keyword、idx_keywords_status_weight 等）

### Requirement: 数据库连接可用

`packages/db/src/client.ts` SHALL 导出一个 Drizzle 数据库实例，通过 DATABASE_URL 环境变量连接 PostgreSQL。

#### Scenario: 连接成功
- **WHEN** DATABASE_URL 指向有效的 PostgreSQL 实例
- **THEN** `import { db } from "@kaiwu/db"` 可获得可用的数据库连接

### Requirement: 迁移可执行

`packages/db/drizzle.config.ts` SHALL 正确配置，`drizzle-kit generate` 和 `drizzle-kit migrate` 可成功执行。

#### Scenario: 生成迁移
- **WHEN** 执行 `pnpm --filter @kaiwu/db drizzle-kit generate`
- **THEN** 在 `drizzle/` 目录生成 SQL 迁移文件

#### Scenario: 执行迁移
- **WHEN** 执行 `pnpm --filter @kaiwu/db drizzle-kit migrate`
- **THEN** 13 张表在数据库中创建成功

### Requirement: barrel 导出完整

`packages/db/src/index.ts` SHALL 导出 db 实例、所有 schema、所有枚举，其他 package 可直接使用。

#### Scenario: 外部 package 导入
- **WHEN** 在 apps/site 中写 `import { db, users, projects, PROJECT_STATUS } from "@kaiwu/db"`
- **THEN** TypeScript 编译通过，所有导出可用
