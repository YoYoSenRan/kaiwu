# Chat 表结构重设计

## 背景与动机

当前 `chats` 表用一个 JSON `config` 字段同时承载了引擎运行时参数（historyBudget、turnStrategy 等）和 UI 显示偏好（showThinking、showToolCalls 等），外加一个几乎未使用的 `metadata` 字段。这带来了几个问题：

1. **职责混杂**：改 UI 开关和改 AI 编排参数耦合在同一张表的同一个 JSON blob 里
2. **类型脆弱**：JSON 字段靠 zod 在运行时兜底，schema 演进时无法做列级迁移或索引
3. **单/多代理边界模糊**：`mode` 字段把 `single` 和 `roundtable/pipeline/debate/delegation` 并列，但 chat 本质上是一个持久房间，单聊只是"房间里只有一个成员且没有特殊协作模式"的自然状态
4. **成员信息缺失**：`chat_members` 没有记录成员加入时间和排序，动态邀请/移除后难以追溯

## 核心设计原则

- **Chat 是持久房间**，不是一次性任务
- **mode 描述多 agent 协作规则**，null 表示没有特殊编排（自然单聊）
- **引擎配置与 UI 偏好严格分离**，各自成表、平铺为列
- **统计数据走聚合查询**，不材料化到主表
- **保持 OpenClaw 桥接兼容**：`session_key` 仍然 lazy 创建，聊天记录和调用记录结构不变

## 表结构

### chats（对话房间主表）

```sql
CREATE TABLE chats (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  mode        TEXT CHECK(mode IN ('roundtable', 'pipeline', 'debate', 'delegation')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_chats_updated ON chats(updated_at DESC);
```

**字段说明**

| 字段 | 说明 |
|------|------|
| `id` | UUID 主键 |
| `title` | 房间标题，用户可编辑 |
| `mode` | **可空**。有值时表示该房间启用了对应的多 agent 协作编排；`null` 表示没有特殊协作模式（自然单聊） |
| `status` | 生命周期状态。`paused`/`completed` 是某次运行态，不应挂在房间上，因此只保留 `active` / `archived` |
| `created_at` / `updated_at` | Unix 时间戳（毫秒） |

### chat_run_configs（引擎运行时配置，1:1 从表）

承载 AI 编排策略、上下文预算、知识库召回参数等。所有字段平铺为强类型列。

```sql
CREATE TABLE chat_run_configs (
  chat_id                 TEXT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  history_budget          INTEGER NOT NULL DEFAULT 40,
  knowledge_budget        INTEGER NOT NULL DEFAULT 20,
  memory_budget           INTEGER NOT NULL DEFAULT 10,
  system_reserved         INTEGER NOT NULL DEFAULT 30,
  history_strategy        TEXT NOT NULL DEFAULT 'recent' CHECK(history_strategy IN ('recent', 'summary', 'full')),
  history_max_messages    INTEGER NOT NULL DEFAULT 20,
  knowledge_ids           TEXT NOT NULL DEFAULT '[]',
  knowledge_max_chunks    INTEGER NOT NULL DEFAULT 5,
  knowledge_min_relevance REAL NOT NULL DEFAULT 0.7,
  turn_strategy           TEXT NOT NULL DEFAULT 'sequential' CHECK(turn_strategy IN ('sequential', 'random', 'adaptive')),
  max_rounds              INTEGER NOT NULL DEFAULT 5,
  auto_stop               INTEGER NOT NULL DEFAULT 1
);
```

**对应 `ChatConfig` zod schema**

| 列名 | schema 字段 | 默认值 |
|------|-------------|--------|
| `history_budget` | `historyBudget` | `40` |
| `knowledge_budget` | `knowledgeBudget` | `20` |
| `memory_budget` | `memoryBudget` | `10` |
| `system_reserved` | `systemReserved` | `30` |
| `history_strategy` | `historyStrategy` | `"recent"` |
| `history_max_messages` | `historyMaxMessages` | `20` |
| `knowledge_ids` | `knowledgeIds`（JSON 数组字符串） | `[]` |
| `knowledge_max_chunks` | `knowledgeMaxChunks` | `5` |
| `knowledge_min_relevance` | `knowledgeMinRelevance` | `0.7` |
| `turn_strategy` | `turnStrategy` | `"sequential"` |
| `max_rounds` | `maxRounds` | `5` |
| `auto_stop` | `autoStop` | `true` |

### chat_display_settings（UI 显示偏好，1:1 从表）

只被 renderer 侧读取，与引擎层完全解耦。

```sql
CREATE TABLE chat_display_settings (
  chat_id           TEXT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  show_thinking     INTEGER NOT NULL DEFAULT 0,
  show_tool_calls   INTEGER NOT NULL DEFAULT 1,
  compact_mode      INTEGER NOT NULL DEFAULT 0,
  render_markdown   INTEGER NOT NULL DEFAULT 1
);
```

### chat_members（房间成员关系）

保留 `config` 字段（当前圆桌模式正在用它存储 `role`），新增排序和加入时间。

```sql
CREATE TABLE chat_members (
  chat_id     TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL,
  session_key TEXT,
  config      TEXT NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  joined_at   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chat_id, agent_id)
);

CREATE INDEX idx_cm_chat_order ON chat_members(chat_id, sort_order);
```

**变更点**
- 新增 `sort_order`：决定多 agent 场景下的发言顺序和界面展示顺序
- 新增 `joined_at`：记录成员加入时间，支持历史追溯
- `config` 暂时保留，内含圆桌角色的 `role` 字段

### 保持不变的两张表

- `chat_messages`：消息内容、发送状态、关联 invocation_id/run_id 等不变
- `chat_invocations`：调用记录、token 用量、费用、原始响应等不变

统计类数据（消息数、总 token、总费用、最后活跃时间）全部通过聚合查询从 `chat_messages` / `chat_invocations` 实时产出，不材料化到 `chats` 表。

## 数据流

### 创建房间

```
用户选择 agent(s) 创建 chat
  │
  ├─ 1. INSERT INTO chats (id, title, mode, status, created_at, updated_at)
  ├─ 2. INSERT INTO chat_run_configs (chat_id) -- 全默认值
  ├─ 3. INSERT INTO chat_display_settings (chat_id) -- 全默认值
  └─ 4. INSERT INTO chat_members (chat_id, agent_id, sort_order, joined_at)
        VALUES (..., 0, Date.now())
```

### 首次发送消息（lazy session 创建）

```
handleSendMessage / handleStartRoundtable
  │
  ├─ getChat(chatId) -- LEFT JOIN chat_run_configs / chat_display_settings
  ├─ listMembers(chatId)
  ├─ resolveConfig(chatId, member.config)
  │     └─ 从 chat_run_configs 读取平铺列 → 组装成 ChatConfig
  ├─ ensureSession(runtime, chatId, member)
  │     └─ 若无 session_key，调用 runtime.sessionCreate() 并回写
  └─ runAgent(runtime, { config, ... })
```

### 更新配置

- 更新引擎参数（如 `maxRounds`、`turnStrategy`）→ 写 `chat_run_configs`
- 更新 UI 偏好（如 `showThinking`、`showToolCalls`）→ 写 `chat_display_settings`

## 单聊 vs 多 agent 的判断逻辑

| 场景 | 判断依据 | 行为 |
|------|----------|------|
| 单聊 | `chat_members` 只有 1 行 | 用户消息直接发给该 agent，`mode` 字段不参与逻辑 |
| 多 agent 自然对话 | 成员 ≥2 且 `chats.mode IS NULL` | 无编排，用户可 @ 某个 agent 或自由对话 |
| 多 agent 圆桌/流水线/辩论/委派 | 成员 ≥2 且 `chats.mode = '...'` | 触发对应编排器 |

## 迁移策略

由于 SQLite 不支持 `DROP COLUMN`，且 `chats` 被 `chat_messages` / `chat_invocations` 外键引用，采用"重命名旧表 + 建新表 + 数据迁移 + 删旧表"策略。

```sql
PRAGMA foreign_keys = OFF;

-- 备份旧表
ALTER TABLE chats RENAME TO _chats_old;
ALTER TABLE chat_members RENAME TO _chat_members_old;

-- 创建新表（按上方 schema）
CREATE TABLE chats (...);
CREATE TABLE chat_run_configs (...);
CREATE TABLE chat_display_settings (...);
CREATE TABLE chat_members (...);

-- 迁移 chats 主数据
INSERT INTO chats (id, title, mode, status, created_at, updated_at)
SELECT
  id,
  title,
  CASE WHEN mode = 'single' THEN NULL ELSE mode END,
  CASE WHEN status IN ('active', 'archived') THEN status ELSE 'active' END,
  created_at,
  updated_at
FROM _chats_old;

-- 迁移引擎配置：全部用默认值（旧 JSON 结构不统一，由 ChatConfig zod 兜底更安全）
INSERT INTO chat_run_configs (chat_id)
SELECT id FROM _chats_old;

-- 迁移显示偏好：尝试从旧 config JSON 中提取
INSERT INTO chat_display_settings (
  chat_id,
  show_thinking,
  show_tool_calls
)
SELECT
  id,
  COALESCE(json_extract(config, '$.showThinking'), 0),
  COALESCE(json_extract(config, '$.showToolCalls'), 1)
FROM _chats_old;

-- 迁移成员
INSERT INTO chat_members (chat_id, agent_id, session_key, config, sort_order, joined_at)
SELECT chat_id, agent_id, session_key, config, 0, 0
FROM _chat_members_old;

-- 清理旧表
DROP TABLE _chats_old;
DROP TABLE _chat_members_old;

PRAGMA foreign_keys = ON;
```

> 在 `PRAGMA foreign_keys = OFF` 期间删除 `_chats_old` 不会触发级联删除，因为外键检查已关闭。`chat_messages` 和 `chat_invocations` 的 `chat_id` 值与新 `chats` 表的行一一对应，迁移后数据保持完整。

## 与 OpenClaw 的兼容性

- **两层 session 模型不变**：Kaiwu `Chat` 对应 OpenClaw `Session`，`chat_members.session_key` 仍然首次发消息时 lazy 创建
- **session key 格式不变**：`agent:<agentId>:dashboard:<uuid>`
- **聊天记录同步不变**：`chat_messages` / `chat_invocations` 结构未动，`syncMessages` 逻辑不受影响
- **OpenClaw 桥接层不变**：`ensureSession` 和 `handleSyncChat` 的调用契约保持原样

## 涉及文件

| 文件 | 改动 |
|------|------|
| `electron/db/schema.ts` | 重写 `chats`，新增 `chat_run_configs` / `chat_display_settings`，调整 `chat_members` |
| `electron/db/migrations/0004_chat_refactor.sql` | 新建迁移文件（重命名旧表、建新表、迁移数据） |
| `electron/db/migrate.ts` | 注册 `0004_chat_refactor` 迁移 |
| `electron/features/chat/types.ts` | `ChatRow` 去掉 `config`/`metadata`，新增 `runConfig` / `displaySettings`；`ChatMode` 去掉 `single`；`ChatStatus` 收缩；`ChatMemberRow` 新增字段 |
| `electron/features/chat/crud.ts` | `listChats` / `getChat` 做 LEFT JOIN 组装；`createChat` 同时写 4 张表；拆分 `updateChatRunConfig` + `updateChatDisplaySettings` |
| `electron/features/chat/ipc.ts` | `updateConfig` handler 内部按 key 路由到两张从表 |
| `electron/engine/context.ts` | `resolveConfig` 改为从 `chat_run_configs` 读取并组装 `ChatConfig` |
| `electron/features/chat/turn.ts` | 调用 `resolveConfig(chatId, member.config)` |
| `electron/features/chat/roundtable.ts` | 同上 |
| `app/pages/chat/components/messages.tsx` | `showThinking` / `showToolCalls` 从 `displaySettings` 读取 |
| `app/pages/chat/components/header.tsx` | 同上；`toggleConfig` 保持现有 IPC 调用 |
| `app/pages/chat/components/panel.tsx` | 上下文预算、编排参数从 `runConfig` 读取 |
