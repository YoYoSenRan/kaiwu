# 聊天数据层重设计

## 背景与动机

当前 `chatMessages` 表承担了两个职责：对话内容展示 + OpenClaw 调用元数据存储。存在以下问题：

1. **元数据不全**：OpenClaw 返回的 token 用量（cacheRead/cacheWrite）、费用（cost）、模型（model）等字段未存储
2. **耦合 OpenClaw 字段演进**：每次 OpenClaw 新增返回字段，kaiwu 都需要改表
3. **对账脆弱**：当前用 `sender_type:content` 文本匹配去重，重复内容消息会被误跳过
4. **缺乏调用级视角**：后续需要按 agent/模型/时间段聚合统计 token 消耗和费用，但调用元数据散落在消息行里，和消息内容混在一起

## 核心约束

- **kaiwu 是数据归属方**：OpenClaw 可能被卸载或会话被删除，kaiwu 必须第一时间持有完整数据
- **支持后续聚合统计**：按对话/agent/模型/时间段统计 token 消耗和费用
- **不追着 OpenClaw 改表**：OpenClaw 字段演进时，kaiwu 不需要频繁迁移 schema
- **数据不能出错**：不丢、不重复、不不一致

## 设计方案：双表分离

### 表结构

#### chat_messages（对话消息）

纯粹的对话记录——谁在什么时候说了什么。

```sql
CREATE TABLE chat_messages (
  id              TEXT    PRIMARY KEY,
  chat_id         TEXT    NOT NULL,
  sender_type     TEXT    NOT NULL,    -- 'user' | 'agent' | 'system'
  sender_agent_id TEXT,                -- agent 发言时的 agent_id
  content         TEXT    NOT NULL,    -- 纯文本正文
  status          TEXT    NOT NULL DEFAULT 'confirmed',  -- 'pending' | 'confirmed' | 'failed'
  invocation_id   TEXT,                -- 关联 chat_invocations.id（agent 消息才有）
  run_id          TEXT,                -- OpenClaw 的 runId（去重用）
  remote_seq      INTEGER,            -- OpenClaw __openclaw.seq（单次 sync 增量跳过用）
  content_hash    TEXT,                -- content 前 100 字符的 hash（去重辅助）
  metadata        TEXT    NOT NULL DEFAULT '{}',  -- kaiwu 侧标记（如 { synced: true }）
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_cm_chat      ON chat_messages (chat_id, created_at);
CREATE INDEX idx_cm_run       ON chat_messages (chat_id, run_id);
CREATE INDEX idx_cm_hash      ON chat_messages (chat_id, sender_type, content_hash, created_at);
```

#### chat_invocations（调用记录）

一次 agent 调用 = 一行。承载计费/监控维度的数据。

```sql
CREATE TABLE chat_invocations (
  id              TEXT    PRIMARY KEY,  -- 即 run_id
  chat_id         TEXT    NOT NULL,
  session_key     TEXT    NOT NULL,
  agent_id        TEXT    NOT NULL,
  model           TEXT,
  provider        TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cache_read      INTEGER,
  cache_write     INTEGER,
  cost            REAL,                -- 总费用（USD）
  stop_reason     TEXT,
  duration_ms     INTEGER,             -- 调用耗时（可选，如果能计算）
  raw             TEXT,                -- OpenClaw final 事件原始 JSON
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_ci_chat      ON chat_invocations (chat_id, created_at);
CREATE INDEX idx_ci_agent     ON chat_invocations (agent_id, created_at);
CREATE INDEX idx_ci_model     ON chat_invocations (model, created_at);
CREATE INDEX idx_ci_session   ON chat_invocations (session_key);
```

### 字段职责划分

| 数据                                 | 归属             | 说明                |
| ------------------------------------ | ---------------- | ------------------- |
| 谁说了什么（content, sender_type）   | chat_messages    | 对话展示            |
| 消息发送状态（status）               | chat_messages    | 乐观写入 + 状态追踪 |
| 花了多少 token（input/output/cache） | chat_invocations | 调用级统计          |
| 花了多少钱（cost）                   | chat_invocations | 费用聚合            |
| 用了什么模型（model, provider）      | chat_invocations | 模型分析            |
| OpenClaw 原始数据（raw）             | chat_invocations | 未来字段兜底        |
| kaiwu 侧标记（metadata）             | chat_messages    | 如 synced 标记      |

### 与现有表的关系

```
chats (不变)
├── id, title, mode, status, config, metadata, created_at, updated_at

chat_members (不变)
├── chat_id, agent_id, session_key, config

chat_messages (改造)
├── 新增: status, invocation_id, run_id, remote_seq, content_hash
├── 移除: metadata 中不再存 usage（改由 invocation 承载）

chat_invocations (新增)
├── 从 OpenClaw ChatEvent final 提取的调用记录
```

## 数据流

### 实时写入（主路径）

```
用户点发送
  │
  ├─ 1. 乐观写入 chat_messages (status='pending', sender_type='user')
  │     → UI 立即显示用户消息
  │
  ├─ 2. chatSend() → gateway
  │
  ├─ 3. onSendConfirmed(runId)
  │     → UPDATE chat_messages SET status='confirmed' WHERE id=?
  │
  ├─ 4. onDelta(text)
  │     → 推送到 renderer 做流式渲染
  │
  └─ 5. onFinal(rawEvent)
        → BEGIN TRANSACTION
            INSERT INTO chat_messages (agent 回复, invocation_id=runId, run_id=runId)
            INSERT INTO chat_invocations (id=runId, model, tokens, cost, raw=原始JSON)
          COMMIT
```

### 补偿同步（断线恢复 / 启动对账）

```
sync(chatId) 触发
  │
  ├─ 对每个 member 的 session_key：
  │
  │   1. 查本地该 session 的最新消息时间戳 lastTs
  │
  │   2. chat.history(sessionKey) → 远程消息列表
  │
  │   3. 过滤：只处理 timestamp > lastTs 的远程消息
  │      （防止 compaction 后的摘要消息被误补录）
  │
  │   4. 对每条远程消息：
  │      │
  │      ├─ assistant 消息：
  │      │   查 chat_invocations 是否已有（靠 run_id 或 __openclaw.id）
  │      │   → 已有：跳过（实时路径已写入）
  │      │   → 没有：
  │      │     BEGIN TRANSACTION
  │      │       INSERT OR IGNORE INTO chat_messages
  │      │       INSERT OR IGNORE INTO chat_invocations
  │      │     COMMIT
  │      │
  │      └─ user 消息：
  │          查 chat_messages 是否已有
  │          （靠 chat_id + sender_type + content_hash + timestamp ±2s 容差）
  │          → 已有：跳过
  │          → 没有：INSERT OR IGNORE INTO chat_messages
  │
  └─ 返回补录总条数
```

## 去重策略

### Agent 消息去重

主键：`run_id`。

- 实时写入时，`run_id` 来自 `ChatEvent.runId`
- 补偿同步时，`run_id` 来自远程消息的 `__openclaw.id` 或消息内嵌的标识
- `chat_invocations.id = run_id`，`INSERT OR IGNORE` 天然幂等
- `chat_messages` 上的 `UNIQUE INDEX (chat_id, run_id)` 防止消息重复

### User 消息去重

无 run_id，用模糊匹配：

- 去重键：`chat_id + sender_type='user' + content_hash + created_at`
- `content_hash`：取 content 前 100 字符的 SHA-256 hex 前 16 位
- 时间容差：±2 秒（覆盖时钟偏差）
- 查询：`SELECT 1 FROM chat_messages WHERE chat_id=? AND sender_type='user' AND content_hash=? AND created_at BETWEEN ?-2000 AND ?+2000 LIMIT 1`

### 为什么不用 remote_seq 做跨次去重

`__openclaw.seq` 是 OpenClaw 读取转录文件时按位置分配的序号。Compaction 后转录文件重写，序号会变。因此 `remote_seq` 仅用于**单次 sync 内的增量优化**（快速跳过已处理的消息），不作为持久化去重标识。

## 容错设计

### 事务一致性

两表写入必须包在同一个 SQLite 事务里：

```ts
db.transaction(() => {
  db.insert(chatMessages).values({ ... }).run()
  db.insert(chatInvocations).values({ ... }).run()
})
```

agent 消息的 message 行和 invocation 行要么都写入，要么都不写入。

### 乐观写入 + 状态标记

用户消息不等 gateway 确认就先入库（`status='pending'`），避免网络延迟时消息"凭空消失"。状态流转：

```
pending  ──onSendConfirmed──→  confirmed
pending  ──超时/失败────────→  failed（UI 显示重试按钮）
```

### 发送失败时的 rollback

如果 `chatSend()` 抛错（gateway 拒绝），将 pending 消息标记为 `failed`，不删除。用户可以看到自己发了什么、失败了，选择重试。

### 并发保护

- 实时写入和补偿同步可能同时操作同一条消息
- 靠 `INSERT OR IGNORE` + 唯一约束保证幂等，不加锁
- SQLite 的 WAL 模式支持并发读写

### 防御性字段提取

从 OpenClaw 事件提取字段时，类型不对填 null，不让一个字段的异常导致整条记录失败：

```ts
function safeNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function safeString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null
}
```

`raw` 字段始终存完整原始 JSON，即使提列失败，数据也不丢。

### OpenClaw Compaction 保护

Compaction 后 `chat.history` 返回的消息中，被压缩的旧消息会变成摘要，timestamp 通常比原始消息早。同步时加时间窗口保护：

```ts
// 只处理比本地最新消息更新的远程消息
const lastTs = getMaxCreatedAt(chatId, sessionKey)
for (const msg of remoteMessages) {
  if (msg.timestamp <= lastTs) continue
  // ...补录
}
```

### Session 丢失处理

OpenClaw 侧 session 被删除时，`chat.history()` 报错。处理方式：

- 单个 session 失败不影响其他 session 的同步
- 本地数据**不删除**（kaiwu 是数据归属方）
- 可选：标记 `chat_members.session_state = 'lost'`，UI 提示远端会话已失效

### Sync 中途崩溃

每条消息的写入是独立的幂等操作。不用整批事务。崩溃后重跑 sync，已有的自动跳过（`INSERT OR IGNORE`），缺的补上。

## 查询示例

### 单条消息展示元信息

```sql
SELECT m.content, m.sender_type, m.sender_agent_id, m.created_at,
       i.model, i.input_tokens, i.output_tokens,
       i.cache_read, i.cache_write, i.cost, i.stop_reason
FROM chat_messages m
LEFT JOIN chat_invocations i ON m.invocation_id = i.id
WHERE m.chat_id = ?
ORDER BY m.created_at ASC
```

### 对话级费用汇总

```sql
SELECT SUM(cost) as total_cost,
       SUM(input_tokens) as total_input,
       SUM(output_tokens) as total_output
FROM chat_invocations
WHERE chat_id = ?
```

### 按模型统计 token 消耗

```sql
SELECT model,
       COUNT(*) as call_count,
       SUM(input_tokens + output_tokens) as total_tokens,
       SUM(cost) as total_cost
FROM chat_invocations
GROUP BY model
ORDER BY total_cost DESC
```

### 按 agent 统计调用

```sql
SELECT agent_id,
       COUNT(*) as call_count,
       SUM(cost) as total_cost,
       AVG(output_tokens) as avg_output
FROM chat_invocations
WHERE chat_id = ?
GROUP BY agent_id
```

### 缓存命中率分析

```sql
SELECT model,
       SUM(cache_read) as total_cache_hit,
       SUM(input_tokens) as total_input,
       ROUND(100.0 * SUM(cache_read) / NULLIF(SUM(input_tokens), 0), 1) as hit_rate_pct
FROM chat_invocations
GROUP BY model
```

## 迁移策略

### 从现有表迁移

1. `chat_messages` 表新增列：`status`, `invocation_id`, `run_id`, `remote_seq`, `content_hash`
2. 新建 `chat_invocations` 表
3. 将现有 `chat_messages.metadata` 中的 usage 数据迁移到 `chat_invocations`
4. 回填 `content_hash`

### 向后兼容

- 现有消息的 `status` 默认为 `'confirmed'`（已确认的历史数据）
- 现有消息的 `invocation_id` / `run_id` 为 null（历史数据无法关联）
- `metadata` 中的旧 usage 数据保留不删，但新写入不再往 metadata 存 usage

## 涉及文件

| 文件                                     | 改动                                                                |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `electron/db/schema.ts`                  | chat_messages 加列 + 新建 chat_invocations 表                       |
| `electron/features/chat/types.ts`        | 新增 ChatInvocationRow 类型，ChatStreamEvent 加 model/cost          |
| `electron/features/chat/service.ts`      | 重写 insertMessage / syncMessages，新增 invocation CRUD             |
| `electron/features/chat/orchestrator.ts` | onFinal 传原始事件，两表事务写入，乐观写入 user 消息                |
| `electron/features/chat/ipc.ts`          | buildRuntime 提取完整字段（不再丢 cacheRead/cacheWrite/cost/model） |
| `electron/features/chat/channels.ts`     | 如需新增 IPC channel                                                |
| `electron/features/chat/bridge.ts`       | 如需暴露新 API                                                      |
| `electron/engine/runner.ts`              | onFinal 回调签名改为传原始 event                                    |
| `electron/engine/types.ts`               | EngineRunParams.onFinal 签名变更                                    |
| `electron/openclaw/gateway/contract.ts`  | ChatEvent 补全 message 内嵌的 cost/model 字段声明                   |
| `app/stores/chat.ts`                     | 适配新的消息类型                                                    |
| `app/pages/chat/components/messages.tsx` | 消息页脚渲染 token/cost/model 元信息                                |
| `app/types/chat.ts`                      | 重导出新类型                                                        |
