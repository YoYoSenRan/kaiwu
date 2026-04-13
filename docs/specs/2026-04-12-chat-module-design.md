# 对话模块设计文档

## 概述

kaiwu 桌面客户端的对话模块，支持单 agent 对话和多 agent 协作对话。采用 kaiwu 本地编排 + OpenClaw 插件注入的架构，通过参数化的上下文预算系统灵活控制 token 消耗。

### 分期交付

- **P1**：单 agent 对话 + 圆桌讨论模式（本文档范围）
- **P2**：流水线模式 + 对抗辩论模式
- **P3**：委派协调模式

### 五种对话模式（全量）

| 模式     | 描述                                             | 期数 |
| -------- | ------------------------------------------------ | ---- |
| 单 agent | 用户与一个 agent 的标准对话                      | P1   |
| 圆桌讨论 | 多 agent 自由讨论/辩论/头脑风暴，用户当主持人    | P1   |
| 流水线   | 顺序执行：A 产出 → B 加工 → C 打磨               | P2   |
| 对抗辩论 | 两个 agent 持对立观点辩论，用户做裁判            | P2   |
| 委派协调 | coordinator agent 分析拆解任务，分派给专家 agent | P3   |

---

## 架构

### 系统分层

```
┌─────────────────────────────────────────────┐
│  Renderer (app/)                            │
│  pages/chat/ + stores/ + components/chat/   │
│  UI 展示 + 用户交互 + 本地状态              │
└──────────────────┬──────────────────────────┘
                   │ IPC Bridge
┌──────────────────┴──────────────────────────┐
│  Main Process                               │
│  ┌─────────────────┐  ┌──────────────────┐  │
│  │ features/chat/  │  │ engine/          │  │
│  │ 对话 CRUD       │→│ 编排引擎          │  │
│  │ 消息持久化      │  │ agent 调度       │  │
│  │ UI 通信         │  │ 上下文预算       │  │
│  └─────────────────┘  │ 流式响应管理     │  │
│                       └────────┬─────────┘  │
└────────────────────────────────┼─────────────┘
                   │ WebSocket / RPC
       ┌───────────┴───────────┐
┌──────┴────────┐  ┌───────────┴──────────┐
│ OpenClaw      │  │ kaiwu Plugin         │
│ Gateway       │  │ before_prompt_build   │
│ chat.send     │  │ 共享上下文 → prompt   │
│ chat.history  │  │                      │
│ chat.abort    │  │                      │
└───────────────┘  └──────────────────────┘
                   │
       ┌───────────┴───────────┐
       │ SQLite (better-sqlite3)│
       │ chats / chat_messages  │
       │ / chat_members         │
       └───────────────────────┘
```

### 目录结构

```
electron/
├── engine/                        编排引擎（领域能力层）
│   ├── types.ts                   引擎接口定义
│   ├── runner.ts                  执行器（调 gateway、管理流式）
│   ├── context.ts                 上下文预算计算 + 组装
│   └── strategy.ts                轮转策略
│
├── core/                          基础设施（不变）
└── features/
    └── chat/                      对话模块
        ├── channels.ts            IPC channel 常量
        ├── types.ts               Bridge 接口类型
        ├── service.ts             对话 CRUD、消息存取
        ├── orchestrator.ts        调用 engine 编排对话
        ├── ipc.ts                 setupChat() 注册 ipcMain.handle
        └── bridge.ts              preload 暴露给 renderer

app/
└── pages/chat/                    Chat 页面
    ├── chat.tsx                   页面入口
    └── components/                私有组件
```

### 依赖规则

```
core ← engine ← features
```

- engine 可 import core（用 logger、store 等基础设施）
- features 可 import engine（调度 agent）
- engine 不 import features（不知道具体业务）
- features 之间仍然互不 import

---

## 数据模型

三张表，核心字段用列，扩展字段用 JSON：

```sql
chats (
  id          TEXT PRIMARY KEY,     -- uuid
  title       TEXT NOT NULL,
  mode        TEXT NOT NULL,        -- 'single' | 'roundtable' | 'pipeline' | 'debate' | 'delegation'
  status      TEXT DEFAULT 'active',-- 'active' | 'paused' | 'completed' | 'archived'
  config      TEXT DEFAULT '{}',    -- JSON: 上下文预算、编排参数、知识库关联等
  metadata    TEXT DEFAULT '{}',    -- JSON: 统计、临时状态等运行时数据
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
)

chat_messages (
  id               TEXT PRIMARY KEY, -- uuid
  chat_id          TEXT NOT NULL,    -- FK → chats.id
  sender_type      TEXT NOT NULL,    -- 'user' | 'agent' | 'system'
  sender_agent_id  TEXT,             -- agent 发言时填
  content          TEXT NOT NULL,
  metadata         TEXT DEFAULT '{}',-- JSON: run_id, token_usage, status, attachments 等
  created_at       INTEGER NOT NULL
)

chat_members (
  chat_id     TEXT NOT NULL,         -- FK → chats.id
  agent_id    TEXT NOT NULL,         -- OpenClaw agent ID
  session_key TEXT,                  -- 该 agent 在此对话中的 session key
  config      TEXT DEFAULT '{}',     -- JSON: role, color, sort_order, per-agent 预算覆盖
  PRIMARY KEY (chat_id, agent_id)
)
```

TypeScript 侧通过 zod schema 约束 JSON 结构，加新参数只改 schema（带 default），老数据自动兼容。

---

## 上下文预算参数体系

### 三层优先级

```
全局默认 → 对话级 (chats.config) → 成员级 (chat_members.config)
```

下层覆盖上层，未设置的字段 fallback 到上层。

### 参数清单

```ts
const chatConfigSchema = z.object({
  // 上下文预算比例（占模型 context window 百分比，总和 ≤ 100）
  historyBudget: z.number().default(40), // 会话/共享历史
  knowledgeBudget: z.number().default(20), // 知识库 RAG
  memoryBudget: z.number().default(10), // Agent 记忆
  systemReserved: z.number().default(30), // 系统保留（system prompt + 工具）

  // 历史策略
  historyStrategy: z.enum(["recent", "summary", "full"]).default("recent"),
  historyMaxMessages: z.number().default(20),

  // 知识库
  knowledgeIds: z.array(z.string()).default([]),
  knowledgeMaxChunks: z.number().default(5),
  knowledgeMinRelevance: z.number().default(0.7),

  // 编排参数（多 agent）
  turnStrategy: z.enum(["sequential", "random", "adaptive"]).default("sequential"),
  maxRounds: z.number().default(5),
  autoStop: z.boolean().default(true),
})
```

### 运行时解析

```ts
function resolveConfig(globalDefaults, chatConfig, memberConfig) {
  return { ...globalDefaults, ...chatConfig, ...memberConfig }
}
```

所有参数都有 default，后续通过实际使用调优默认值。

---

## OpenClaw 插件扩展

### 现有基础（保持不动）

- WebSocket bridge（transport.ts）：插件 ↔ kaiwu 双向通信
- `before_prompt_build` hook（hook.ts）：按 sessionKey 注入上下文
- StageContext store（store.ts）：内存 Map 按 sessionKey 存取
- invoke action 路由（route.ts）：`stage.set` / `stage.clear`

### 扩展点

扩展 `StageContext` 接口，增加共享历史字段：

```ts
export interface StageContext {
  instruction: string // 已有：角色指令 → appendSystemContext
  knowledge: string[] // 已有：知识库片段 → prependContext
  sharedHistory?: string // 新增：共享对话历史 → prependContext
}
```

hook 中将 `sharedHistory` 和 `knowledge` 合并注入到 `prependContext`：

```ts
if (data.sharedHistory || data.knowledge.length > 0) {
  const parts = []
  if (data.sharedHistory) parts.push(data.sharedHistory)
  if (data.knowledge.length > 0) parts.push(formatKnowledge(data.knowledge))
  result.prependContext = parts.join("\n\n")
}
```

共享历史使用 XML 标签隔离（防 prompt injection）：

```xml
<共享对话记录>
[Architect] 我建议采用 GraphQL 替代 REST...
[Coder] GraphQL 的想法不错，但实现成本较高...
</共享对话记录>
```

### 数据流

```
orchestrator (kaiwu main process)
  → resolveConfig() 计算 token 预算
  → 组装 sharedHistory + knowledge + instruction
  → 通过 invokePlugin({action: "stage.set", params}) 推送到插件
  → 调用 gateway chat.send
  → 插件 before_prompt_build hook 触发，注入上下文
  → agent 基于完整上下文回复
```

---

## 编排引擎 (engine/)

### 职责

- 执行 agent 调用（chat.send + 流式响应管理）
- 计算上下文预算（token 分配）
- 组装 StageContext（角色指令 + 知识库 + 共享历史）
- 推送上下文到插件
- 管理轮转策略

### 不负责

- 对话 CRUD 和消息持久化（chat feature 的事）
- UI 通信（chat feature 通过 IPC 处理）
- 具体的业务编排逻辑（由调用方 orchestrator 定义）

### 核心接口

```ts
// engine/types.ts

interface EngineRunParams {
  sessionKey: string
  agentId: string
  message: string
  contextConfig: ResolvedConfig // 已 resolve 的三层合并配置
  chatId: string // 用于查询知识库和共享历史
  onDelta: (text: string) => void // 流式回调
  onFinal: (message: string, usage: TokenUsage) => void
  onError: (error: Error) => void
  signal?: AbortSignal // 取消控制
}

interface EngineContext {
  instruction: string
  knowledge: string[]
  sharedHistory?: string
}
```

---

## UI 设计

### 页面布局

Chat 页面采用三栏布局：

```
┌──────────┬─────────────────────────┬────────────┐
│          │                         │            │
│  对话    │      聊天区域            │  信息面板   │
│  列表    │                         │            │
│          │  消息列表                │  Agent 信息 │
│  搜索    │  （气泡 + 流式渲染）     │  上下文预算 │
│  + 新建  │                         │  知识库关联 │
│          │                         │  编排参数   │
│  对话项  │  ──────────────          │  统计数据   │
│  (带模式 │  输入框                  │            │
│   标签)  │                         │            │
└──────────┴─────────────────────────┴────────────┘
  ~220px          flex-1                ~240px
```

### 对话列表

- 每项显示：agent 头像、标题、模式标签（单 Agent / 圆桌 / 对抗 等）、最后一条消息预览
- 选中项高亮，颜色跟随模式

### 聊天区域

- 用户消息右对齐蓝色气泡
- Agent 消息左对齐，带头像和名字
- 多 agent 时每个 agent 用独特颜色 + 左侧色条区分
- 流式回复显示光标（▌）
- 圆桌模式头部显示：参与者头像组、讨论状态（第 N 轮）、暂停/停止按钮

### 信息面板

**单 agent 模式**：

- Agent 信息（名称、模型）
- 上下文预算（进度条展示各项比例）
- 关联知识库（列表 + 添加）
- 对话统计（消息数、token 消耗、费用）

**圆桌模式额外内容**：

- 参与者列表（显示发言状态：已发言 / 发言中 / 待发言）
- 编排参数（轮转策略、最大轮次、共享历史条数）
- 添加/移除参与者

---

## 数据流

### 单 Agent 对话

```
1. 用户输入消息
   → renderer store 乐观更新 UI
   → IPC 发送到 main process

2. chat/orchestrator
   → 保存用户消息到 SQLite
   → resolveConfig() 计算上下文预算
   → engine.run() 调度 agent

3. engine
   → 组装 StageContext（instruction + knowledge + 无 sharedHistory）
   → invokePlugin stage.set 推送到插件
   → gateway chat.send(sessionKey, message)

4. OpenClaw Gateway
   → 触发 before_prompt_build hook → 插件注入知识库等
   → LLM 推理，流式返回 delta 事件

5. 流式响应回传
   → engine onDelta → orchestrator → IPC event → renderer 实时渲染
   → final 事件 → 保存完整回复到 SQLite
```

### 圆桌讨论

```
1. 用户发起话题 + 选择参与 agents
   → orchestrator 创建圆桌对话，记录参与者

2. 轮次循环 (round < maxRounds)
   ├── 按轮转策略选择下一个 agent
   ├── orchestrator 组装共享转录（其他人说了什么）
   ├── engine.run() 调度该 agent
   │   → StageContext 包含 sharedHistory
   │   → 插件注入共享历史 + 知识库 + 角色说明
   │   → agent 基于完整上下文回复
   ├── 回复写入 SQLite + UI 实时展示
   └── 检查停止条件（用户叫停 / 达到轮次上限 / autoStop）

3. 用户可随时：
   - 插入发言（作为"主持人"引导方向）
   - 暂停 / 恢复讨论
   - 停止讨论
```

---

## P1 实现范围

### 包含

- Chat 页面三栏布局（对话列表 + 聊天区 + 信息面板）
- 新建对话（选择模式 + 选择 agent）
- 单 agent 对话（发送消息、流式渲染、abort）
- 圆桌讨论（多 agent 轮流发言、暂停/停止、用户插入发言）
- 上下文预算配置（右侧面板可调）
- 知识库关联（选择已有知识库）
- 对话统计（消息数、token、费用）
- 数据持久化（SQLite，chats / chat_messages / chat_members）
- 插件扩展（StageContext 加 sharedHistory）
- engine 编排引擎基础框架

### 不包含

- 流水线 / 对抗辩论 / 委派协调模式（P2/P3）
- 消息编辑 / 删除
- 对话导出
- 消息搜索
- 附件/图片
- 工作流编排（未来独立模块）
