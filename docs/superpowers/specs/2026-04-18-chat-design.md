# Chat 模块设计

**Date**: 2026-04-18
**Status**: Draft — 待用户审核
**Scope**: kaiwu 主进程 `features/chat/` + kaiwu plugin `src/chat/` 扩展

## 1. 目标与非目标

### 目标

- 提供单聊（1 agent）和群聊（N agent）两种会话形态，UI 与代码路径统一
- 群聊采用 **IM 风格**：动态成员增删、@ 提及、共享对话上下文
- 每个群成员可配 `reply_mode: 'auto' | 'mention'`，涌现 supervisor / handoff / 自由群聊三种场景
- 所有消息在 kaiwu 本地持久化一份，独立于 openclaw 的会话存储，保证用户卸载 openclaw 后数据不丢
- 预留未来扩展能力：memory / 标记 / 重要度 / silent-token 优化等

### 非目标

- **不定义 agent 行为**。Agent 的 system prompt、工具集、模型选择由 openclaw 的 agent workspace `.md` 文件管理，kaiwu 不介入
- **不重写 openclaw 的 chat/sessions/agents 能力**，只做编排 + 持久化 + UI
- **不实现 rotation / 固定轮询策略**。用 `reply_mode` 组合覆盖 supervisor/handoff/自由群聊三种场景
- **不做主进程级 LLM 调用**。所有 LLM 交互走 openclaw gateway

---

## 2. 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│  Renderer (React)                                                │
│    app/pages/chat/*  —  UI：消息列表、@输入、成员面板、HITL 输入  │
│         ↓ via window.electron.chat.*                             │
├──────────────────────────────────────────────────────────────────┤
│  Main Process                                                    │
│    features/chat/     —  群聊 loop、路由、持久化、策略             │
│    agent/             —  通用原语：step executor、context 拼装    │
│         ↓ via openclaw RPC                                        │
├──────────────────────────────────────────────────────────────────┤
│  OpenClaw Gateway (外部进程)                                     │
│    chat.send / sessions.* / agents.* / gateway event frames      │
│         ↓ agent 执行                                              │
│    Kaiwu Plugin (openclaw extension)                             │
│      src/context/  — 共享 transcript 注入 prompt（已实现）         │
│      src/chat/     — mention_next / ask_user 工具（新增）         │
│      src/monitor/  — hook 事件回推（已实现）                       │
└──────────────────────────────────────────────────────────────────┘
```

### 三层分工

| 层 | 职责 | 不做 |
|---|---|---|
| **kaiwu 主进程** | 编排 loop、路由决策、预算、持久化、HITL 状态 | agent 行为定义、LLM 调用 |
| **openclaw gateway** | LLM 调用、流式事件、session 生命周期 | 群聊编排 |
| **kaiwu plugin** | 往 agent prompt 注入共享上下文、提供 `mention_next`/`ask_user` 工具、回推 hook 事件 | 决定下一个说话者 |

---

## 3. 数据模型

### 3.1 表结构（drizzle sqlite）

位置：`electron/features/chat/schema.ts`

```ts
chat_sessions
  id              text PK (nanoid)
  mode            text NOT NULL  // 'single' | 'group'
  label           text           // 用户命名
  openclaw_key    text UNIQUE    // 单聊：唯一 openclaw session key；群聊：NULL（每成员自己有 key）
  budget_json     text NOT NULL  // { max_rounds, max_tokens, stop_phrase, wall_clock_sec }
  strategy_json   text NOT NULL  // 扩展点 6：{ kind: 'broadcast' }（MVP），未来 silent/router
  supervisor_id   text           // 群内标记为 supervisor 的成员 agent_id（nullable）
  archived        integer        // 0/1
  created_at      integer
  updated_at      integer

chat_session_members
  id              text PK
  session_id      text FK → chat_sessions.id
  agent_id        text NOT NULL  // openclaw agent id
  openclaw_key    text NOT NULL  // 该成员专属的 openclaw session key
  reply_mode      text NOT NULL  // 'auto' | 'mention'
  joined_at       integer
  left_at         integer        // 离开时间，NULL = 在群
  seed_history    integer        // 0/1：加入时是否喂历史

chat_messages
  id                    text PK
  session_id            text FK → chat_sessions.id
  seq                   integer NOT NULL  // kaiwu 本地序号（session 内单调递增）
  openclaw_session_key  text              // 消息发生的 openclaw session（mirror）
  openclaw_message_id   text              // openclaw 侧消息 id（若有）
  sender_type           text NOT NULL     // 'user' | 'agent' | 'tool' | 'system'
  sender_id             text              // agent_id 或 user_id 或 tool_name
  role                  text NOT NULL     // 'user' | 'assistant' | 'tool' | 'system'
  content_json          text NOT NULL     // 完整 mirror（含 text blocks / tool calls / attachments）
  mentions_json         text              // [{ agent_id, source }]  source=plain|tool
  turn_run_id           text              // 同一轮 chat.send 的 runId（openclaw 侧）
  tags_json             text              // kaiwu 扩展：未来 memory / importance 用
  created_at_local      integer NOT NULL
  created_at_remote     integer           // openclaw 报告的时间戳（若有）

chat_budget_state
  session_id      text PK FK → chat_sessions.id
  rounds_used     integer
  tokens_used     integer
  started_at      integer
  updated_at      integer
```

### 3.2 数据策略

- **双份**：`chat_messages` 完整镜像 openclaw 的消息内容 + kaiwu 自己的扩展字段（`tags_json` 等）
- **引用**：`openclaw_session_key` + `openclaw_message_id` 保留对 openclaw 原始数据的引用，便于未来 reconcile / 重新拉取
- **kaiwu 权威**：UI 只读 kaiwu 本地，不依赖 openclaw 可用性

---

## 4. 运行语义

### 4.1 群聊主循环（`features/chat/group.ts`）

```
loop(sessionId, incoming_message):
  1. 持久化 incoming_message 到 chat_messages
  2. 广播检查：
     - 解析 incoming_message.mentions_json
     - routing.decideTargets(incoming_message, members) → target_members[]
  3. 预算检查：budget.checkAndIncrement() → 超限则终止
  4. 对每个 target_member 并发：
     a. context.buildSharedContext(sessionId, member) → { instruction, sharedHistory, knowledge }
     b. plugin.context.set({ sessionKey: member.openclaw_key, ... })
     c. openclaw.chat.send({ sessionKey: member.openclaw_key, message: incoming_message.content })
     d. 订阅 gateway event 帧：收到 assistant final → interpret.interpretReply()
        - 若 shouldSuppress = true → 丢弃
        - 否则持久化 assistant message + 回 loop(sessionId, assistant_message)
  5. 若 target_members 为空 → 终止
```

### 4.2 路由决策（`routing.ts`，扩展点 1）

```ts
function decideTargets(msg, members) {
  const active = members.filter(m => !m.left_at)
  const explicitMentions = msg.mentions_json.map(m => m.agent_id)
  if (explicitMentions.length > 0) {
    return active.filter(m => explicitMentions.includes(m.agent_id))
  }
  return active.filter(m => m.reply_mode === 'auto')
}
```

### 4.3 Context 拼装（`context.ts`，扩展点 2）

延迟同步策略（7.1=c）：**只在成员被选为 target 的那一刻才 push context**，不持续同步。

```ts
function buildSharedContext(sessionId, member) {
  const transcript = renderTranscript(sessionId, { upTo: now })
  //   "[user]: 问题\n[alice]: 回复\n[bob]: ..."
  const members = renderMemberRoster(sessionId)
  //   "群成员：alice(auto), bob(mention), carol(mention)"
  return {
    instruction: [
      `你在一个多 agent 群聊中。你的身份是 ${member.agent_id}。`,
      `${members}`,
      `你可以调用 mention_next(agent_id) 把话传给其他成员。`,
      `需要用户介入时调用 ask_user(question)。`,
    ].join('\n'),
    sharedHistory: transcript,
    knowledge: [],  // MVP 不接知识库，预留
  }
}
```

### 4.4 @ 提及机制（7.4=工具）

kaiwu plugin 注册 agent 工具 `mention_next`：

```ts
// plugins/kaiwu/src/chat/setup.ts
ctx.api.registerTool({
  name: "mention_next",
  description: "在群聊中把发言权交给另一个成员",
  params: Type.Object({
    agent_id: Type.String(),
    reason: Type.Optional(Type.String()),
  }),
  handler: async (params, toolCtx) => {
    ctx.bridge.send({
      type: "custom",
      ts: Date.now(),
      payload: {
        channel: "chat",
        data: {
          kind: "mention_next",
          sessionKey: toolCtx.sessionKey,
          agentId: params.agent_id,
          reason: params.reason,
        }
      }
    })
    return { ok: true }
  }
})
```

kaiwu 主进程通过 bridge WS 接收 `mention_next` 事件，在下一条 agent 消息落库时把 `mentions_json` 补上。

**降级**：若工具调用失败或 agent 未用工具，plain text 里的 `@agent-id` 也做字符串匹配作为兜底（先匹配 agent_id，其次匹配 agent 的 identity.name，大小写不敏感）。

### 4.5 HITL（7.2=c 简化版）

kaiwu plugin 注册 `ask_user` 工具：

```ts
ctx.api.registerTool({
  name: "ask_user",
  description: "需要用户回答问题或做选择时调用",
  params: Type.Object({
    question: Type.String(),
    options: Type.Optional(Type.Array(Type.String())),
  }),
  handler: async (params, toolCtx) => {
    ctx.bridge.send({
      type: "custom", ts: Date.now(),
      payload: { channel: "chat", data: {
        kind: "ask_user",
        sessionKey: toolCtx.sessionKey,
        question: params.question,
        options: params.options,
      }}
    })
    return { ok: true, message: "Waiting for user input." }
  }
})
```

kaiwu 主进程收到 `ask_user` → 挂起该 session 的 loop → UI 高亮该 agent 消息 + 弹输入框 → 用户回复走常规 user message 路径 → loop 重启。

**约束**：ask_user 工具返回 `"Waiting for user input."` 即该 turn 结束，agent 不会继续 chat。用户回复后作为新的 user message 进入 loop。挂起期间其他 auto 成员也停止推进（单一挂起点）。

### 4.6 预算/终止（`budget.ts`）

```ts
interface BudgetConfig {
  max_rounds?: number        // 默认 20
  max_tokens?: number        // 默认 100_000
  stop_phrase?: string       // 可选，匹配到的消息结束
  wall_clock_sec?: number    // 默认 300
}
```

检查点：每次 `decideTargets` 前调 `budget.checkAndIncrement()`，超限则终止 loop + UI 提示。

### 4.7 单聊（7.3=a）

单聊 = `chat_sessions.mode = 'single'` + `chat_session_members` 只有 1 条记录。完全复用群聊 loop，`decideTargets` 对 1 成员的开销可忽略。

未来用户"@ 添加新成员"升级为群聊时，改 `mode = 'group'` + 插入新成员即可，零数据迁移。

---

## 5. 目录结构

### 5.1 kaiwu 主进程

```
electron/
├── agent/                  # 业务无关的 agent 抽象层
│   ├── types.ts            # Step / Event 类型
│   ├── executor.ts         # 单 step 执行封装（chat.send + 订阅流式）
│   └── context.ts          # context 拼装原语
│
└── features/
    └── chat/
        ├── types.ts        # 业务类型（Session/Member/Message 等）
        ├── schema.ts       # drizzle 表定义
        ├── repository.ts   # CRUD
        ├── routing.ts      # [扩展点 1] decideTargets
        ├── context.ts      # [扩展点 2] buildSharedContext
        ├── interpret.ts    # [扩展点 3] interpretReply
        ├── bootstrap.ts    # [扩展点 4] openclaw session 初始化参数
        ├── budget.ts       # 预算/终止
        ├── single.ts       # 单聊入口（薄封装，调 group loop）
        ├── group.ts        # 群聊 loop
        ├── service.ts      # IpcController 入口
        └── bridge.ts       # preload 桥
```

6 个扩展点对应表：

| 扩展点 | 文件 | MVP | 未来升级 |
|---|---|---|---|
| 1 路由决策 | `routing.ts` | 纯 filter | β 加 silent token 过滤 |
| 2 Context 注入器 | `context.ts` | 拼 transcript + 成员表 | β 加 silent 指令 |
| 3 Reply 后处理 | `interpret.ts` | 永远 `shouldSuppress=false` | β 加 silent marker 识别 |
| 4 Session 初始化 | `bootstrap.ts` | 不设 groupActivation | α 按 reply_mode 映射 |
| 5 reply_mode 字段 | `schema.ts` | `'auto' \| 'mention'` | 加 variant 不破 schema |
| 6 strategy_json | `schema.ts` | `{ kind: 'broadcast' }` | 扩 silent/router 变体 |

### 5.2 kaiwu plugin 增量

```
plugins/kaiwu/src/chat/
  ├── contract.ts    # (已占位) 补类型定义
  ├── setup.ts       # (新) 注册 mention_next + ask_user 工具，订阅工具事件回推
  └── tools.ts       # (新) 工具实现
```

在 `register.ts` 的 `DOMAINS` 里加 `["chat", setupChat]`。

---

## 6. IPC 契约

### 6.1 主进程入口（`service.ts`）

```ts
@Controller("chat")
export class ChatService extends IpcController<ChatEvents> {
  @Handle("session:list")      list()
  @Handle("session:create")    create(input: CreateSessionInput)
  @Handle("session:delete")    delete(id: string)
  @Handle("session:archive")   archive(id: string, archived: boolean)

  @Handle("message:list")      listMessages(sessionId: string)
  @Handle("message:send")      sendUserMessage(sessionId: string, content: string)
  @Handle("message:answer")    // HITL 回答 ask_user
    answerAsk(sessionId: string, pendingId: string, answer: string)
    // pendingId 由 kaiwu 主进程在收到 ask_user 事件时生成（nanoid），
    // 通过 'loop:paused' 事件下发给 renderer，renderer 回传对应

  @Handle("member:add")        addMember(sessionId: string, input: AddMemberInput)
  @Handle("member:remove")     removeMember(sessionId: string, memberId: string)
  @Handle("member:patch")      patchMember(sessionId: string, memberId: string, patch)

  @Handle("budget:get")        getBudget(sessionId: string)
  @Handle("budget:reset")      resetBudget(sessionId: string)

  // 事件推送
  // 'message:new'     assistant/tool 消息到达
  // 'loop:started'    新一轮开始
  // 'loop:paused'     ask_user 挂起
  // 'loop:ended'      预算终止 or 无 target
}
```

### 6.2 renderer 桥（`bridge.ts`）

```ts
window.electron.chat = {
  session: { list, create, delete, archive },
  message: { list, send, answer },
  member: { add, remove, patch },
  budget: { get, reset },
  on: {
    message: (listener) => ...,
    loop:    (listener) => ...,
  }
}
```

---

## 7. 入群携历史（4.1=C）

建群/加成员时 UI 弹窗："是否把现有对话历史注入给新成员？"
- `chat_session_members.seed_history = 1` → 加入后首次被路由选中时，context 注入完整历史
- `seed_history = 0` → 首次被选中时 context 只含加入之后的消息

---

## 8. 消息可见性（4.2=C）

MVP 默认广播（所有成员在被路由选中时能读到全量 transcript）。扩展点 2（`context.ts`）预留 per-member 视图：

```ts
buildSharedContext(sessionId, member) {
  // 未来按 member.visibility_rules 过滤 transcript
}
```

---

## 9. 插件工具细节

### 9.1 `mention_next` 工具

- params: `{ agent_id: string, reason?: string }`
- 验证：agent_id 必须是当前群的在群成员（插件侧不验证——插件无群语义，验证在 kaiwu 主进程）
- kaiwu 主进程收到事件 → 在下条 assistant 消息落库时把 `mentions_json` 补上

### 9.2 `ask_user` 工具

- params: `{ question: string, options?: string[] }`
- handler 返回 `{ ok: true, message: "Waiting for user input." }` 让 agent 停下
- kaiwu 主进程收到事件 → 挂起 loop，UI 弹输入框
- 用户回复走常规 `message:send` 路径，loop 自动重启

### 9.3 双向 context 注入

复用已有 `plugin.context.set`（kaiwu context 域），每轮给 target member 推 `sharedHistory`。

---

## 10. 未来升级路径

### 10.1 升级到 silent-token 机制（β）

当 "多 auto 成员抢话嘈杂" 问题出现：
1. 改 `context.ts`：在 instruction 里加 "If not relevant, output exactly `<SILENT>`"
2. 改 `interpret.ts`：识别 `<SILENT>` 返回 `shouldSuppress=true`
3. 路由不变，数据模型不变

### 10.2 升级到 openclaw-level gating（α）

当需要借用 openclaw 的 groupActivation 自动注入 system prompt：
1. 改 `bootstrap.ts`：加成员时按 `reply_mode` 映射 `sessions.patch({ groupActivation })`
2. 其他不变

### 10.3 未来扩展目录

- `memory/` — 基于 `chat_messages.tags_json` 做长期记忆
- `summary/` — 超长历史摘要
- `export/` — 导出 markdown / JSON

---

## 11. 风险与缓解

| 风险 | 缓解 |
|---|---|
| openclaw 卸载后 kaiwu session 孤立 | 双份存储，kaiwu 本地仍可查看历史；重新连 openclaw 后可选 "重启对话" 创建新 session 继续 |
| agent 调 `mention_next` 提及不存在的成员 | 主进程验证，忽略无效 mention，日志 warn |
| agent 无限 ping-pong（A @ B，B @ A） | `budget.max_rounds` 硬上限 |
| context 拼装历史过长导致 token 爆炸 | `context.ts` 预留 sliding window + summary（future），MVP 先截断最近 N 条 |
| plugin 断线导致工具事件丢失 | plugin 已有 WS 自动重连 + outbox，事件在重连后重放 |
| 多 auto 成员并发嘈杂 | MVP 场景假设 auto 通常 ≤ 1；β 升级增加 silent-token |

---

## 12. MVP 验收

### Must

- 单聊：建会话 → 发消息 → agent 回复 → 历史持久化 → 重启 app 可见历史
- 群聊：加 3 成员（1 auto + 2 mention） → user 发消息 → auto 成员自主回复 → auto 成员调 `mention_next` → mention 成员回复 → 持久化 → 重启可见
- 预算：`max_rounds=5` → 达上限自动终止
- HITL：agent 调 `ask_user` → UI 弹输入 → 用户回复 → loop 继续
- 动态成员：运行中加成员（选择是否喂历史），移除成员

### Should

- 单聊升级为群聊：加成员操作不影响现有消息
- openclaw 重启后 kaiwu 继续能工作（plugin 自动重连）

### Won't（留 future）

- 知识库 chunk 注入 context
- 消息编辑 / 删除
- 消息导出
- 跨 session 搜索
- silent-token 机制
- 成员权限 / 可见性细粒度配置
- rotation / 主持人模式

---

## 13. 未决细节

（交付实现前再定，不阻塞 spec）

- `seq` 分配策略：kaiwu 本地 auto-inc vs 基于时间戳
- `turn_run_id` 取自 openclaw `chat.send` 返回的 runId（通过 gateway event 帧关联）
- openclaw session 创建失败的回滚路径
- agent workspace 不存在时 UI 引导
- 预算配置的默认值具体数字
- UI 对 tool_call 消息的展示形式（折叠卡片？专用块？）

---

## 附录 A：关键源码索引

- kaiwu plugin 架构：`plugins/kaiwu/src/{register,domain}.ts`
- 已有 context 注入：`plugins/kaiwu/src/context/{setup,hook,store}.ts`
- openclaw plugin-sdk 入口：`openclaw/src/plugin-sdk/plugin-entry.ts`
- openclaw 工具注册 API：`openclaw/src/plugins/types.ts`（搜 `registerTool`）
- openclaw before_prompt_build hook：`openclaw/src/agents/attempt.ts`（1652-1686 行注入点）
- openclaw group activation 参考实现：`openclaw/src/auto-reply/reply/groups.ts`（`buildGroupIntro` 函数）
- openclaw 现有 chat RPC 契约：`electron/features/openclaw/contracts/rpc.ts`
