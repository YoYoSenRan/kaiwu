# 00 — 数据库

## 目标

用 Drizzle ORM 定义 13 张表的 schema，生成迁移，写入 8 个局中人的初始数据。完成后其他模块可以直接 import schema 使用。

## 依赖

- 无上游依赖（第一个施工模块）
- PostgreSQL 实例就绪（Supabase / Neon / 本地）

## 文件清单

```
packages/db/
├── drizzle.config.ts                # Drizzle 配置（数据库连接）
├── src/
│   ├── index.ts                     # barrel 导出（db 实例 + 所有 schema）
│   ├── client.ts                    # 数据库连接实例
│   ├── schema/
│   │   ├── users.ts                 # users 表
│   │   ├── keywords.ts             # keywords 表（物帖池）
│   │   ├── votes.ts                # votes 表
│   │   ├── projects.ts             # projects 表（造物令）
│   │   ├── phases.ts               # phases 表（阶段记录）
│   │   ├── debates.ts              # debates 表（过堂记录）
│   │   ├── tasks.ts                # tasks 表（锻造任务）
│   │   ├── agents.ts               # agents 表（局中人注册表）
│   │   ├── agentStats.ts           # agent_stats 表（属性快照）
│   │   ├── agentLogs.ts            # agent_logs 表（日志）
│   │   ├── products.ts             # products 表（器物）
│   │   ├── retrospectives.ts       # retrospectives 表（复盘）
│   │   ├── events.ts               # events 表（事件流）
│   │   └── index.ts                # schema barrel 导出
│   ├── enums.ts                     # 状态枚举和事件类型常量
│   └── seed.ts                      # 种子数据（8 个局中人 + 初始属性）
├── drizzle/                         # 迁移文件（自动生成）
├── package.json
└── tsconfig.json
```

## 实现步骤

### Step 1：项目初始化

1. 在 `packages/db/` 下初始化 package.json
2. 安装依赖：`drizzle-orm` `drizzle-kit` `@neondatabase/serverless`（或 `postgres`）
3. 配置 `drizzle.config.ts`（数据库连接字符串从环境变量读取）
4. 配置 `tsconfig.json`

### Step 2：定义枚举常量

文件：`src/enums.ts`

```ts
// 造物令状态
export const PROJECT_STATUS = {
  Scouting: "scouting",
  Debating: "debating",
  Planning: "planning",
  Building: "building",
  Inspecting: "inspecting",
  Deploying: "deploying",
  Launched: "launched",
  Dead: "dead",
} as const

// 阶段类型
export const PHASE_TYPE = {
  Scout: "scout",
  Council: "council",
  Architect: "architect",
  Builder: "builder",
  Inspector: "inspector",
  Deployer: "deployer",
} as const

// 阶段状态
export const PHASE_STATUS = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Failed: "failed",
  Stale: "stale",
  Blocked: "blocked",
  Skipped: "skipped",
} as const

// Agent 状态
export const AGENT_STATUS = {
  Idle: "idle",
  Thinking: "thinking",
  Working: "working",
  Debating: "debating",
  Blocked: "blocked",
  Done: "done",
  Error: "error",
} as const

// 事件类型（完整列表见数据模型.md）
export const EVENT_TYPE = { ... } as const
```

### Step 3：逐表定义 schema

按以下顺序（外键依赖顺序）：

1. `users.ts` — 无外键依赖
2. `agents.ts` — 无外键依赖
3. `keywords.ts` — FK → users
4. `votes.ts` — FK → users, keywords
5. `projects.ts` — FK → keywords
6. `phases.ts` — FK → projects
7. `debates.ts` — FK → phases, agents
8. `tasks.ts` — FK → projects, phases, agents
9. `agentStats.ts` — FK → agents
10. `agentLogs.ts` — FK → agents, projects, phases, tasks
11. `products.ts` — FK → projects
12. `retrospectives.ts` — FK → projects
13. `events.ts` — FK → projects, phases, agents

每张表的字段、类型、默认值、约束严格按照 `数据模型.md` 定义。

关键注意点：
- UUID 主键用 `uuid().defaultRandom().primaryKey()`
- agents 表主键是 VARCHAR（不是 UUID）：`varchar("id").primaryKey()`
- JSONB 字段用 `jsonb()`
- VARCHAR[] 数组字段用 `varchar().array()`
- UNIQUE 约束用 `.unique()` 或 `uniqueIndex()`
- created_at / updated_at 用 `timestamp().defaultNow()`

### Step 4：定义索引

在各 schema 文件中定义索引，严格按照 `数据模型.md → 索引建议`。

### Step 5：生成迁移

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Step 6：编写种子数据

文件：`src/seed.ts`

写入 8 个局中人的初始数据：

```ts
const agents = [
  {
    id: "youshang",
    name: "游商",
    title: "采风使",
    emoji: "🎒",
    stageType: "scout",
    personality: {
      trait: "走南闯北，嗅觉敏锐，话不多但句句有料",
      style: "简洁有力，像记账一样客观",
      catchphrase: "这条街上的人，十个有八个在为这事发愁。"
    },
    status: "idle",
    activity: "在坊间闲逛，顺便看看有没有新鲜事",
    level: 1,
    levelName: "初出茅庐",
  },
  // ... 其余 7 个局中人
]
```

每个局中人的数据来源：`Agent角色体系.md` + `Agent工作区设计/{角色}/IDENTITY.md`

同时写入每个局中人的初始属性（agent_stats 表）：

```ts
const stats = [
  { agentId: "youshang", statKey: "嗅觉", rawValue: 0, starLevel: 1, sampleSize: 0 },
  { agentId: "youshang", statKey: "脚力", rawValue: 0, starLevel: 1, sampleSize: 0 },
  { agentId: "youshang", statKey: "见闻", rawValue: 0, starLevel: 1, sampleSize: 0 },
  { agentId: "youshang", statKey: "慧眼", rawValue: 0, starLevel: 1, sampleSize: 0 },
  // ... 其余角色的属性
]
```

属性数据来源：`角色属性系统.md → 各角色属性`

### Step 7：barrel 导出

文件：`src/schema/index.ts`

```ts
export * from "./users"
export * from "./keywords"
export * from "./votes"
// ... 所有 13 张表
```

文件：`src/index.ts`

```ts
export { db } from "./client"
export * from "./schema"
export * from "./enums"
```

## 验收标准

- [ ] 13 张表全部创建成功，字段和类型与 `数据模型.md` 完全一致
- [ ] 所有索引创建成功
- [ ] 8 个局中人的初始数据写入成功（agents + agent_stats）
- [ ] `pnpm typecheck` 通过（packages/db 无类型错误）
- [ ] 其他 package 可以 `import { db, users, projects } from "@kaiwu/db"` 正常使用

## 参考文档

- `design/数据模型.md` — 13 张表的完整定义、状态枚举、事件类型、索引
- `design/Agent角色体系.md` — 8 个局中人的人设（seed 数据来源）
- `design/角色属性系统.md` — 各角色属性定义（seed 数据来源）
- `design/Agent工作区设计/各角色/IDENTITY.md` — 名号、emoji、形象
