# Agent 模块 Design

> 目标: kaiwu 侧对 openclaw agents 做**引用层**. kaiwu 维护顺序索引 + 本地元数据, 真实数据由 openclaw gateway 提供. UI 暴露 list + detail + tabs. 数据尽量全拉, UI 可选择性呈现.

---

## 1. 架构

```
┌──────────────────────────────────────────┐
│ kaiwu 本地 DB (agents 表 - 最小索引)      │
│   agent_id (PK)  created_at  updated_at   │
└──────────────────────────────────────────┘
                ▲
                │ 双写 / 引用
                ▼
┌──────────────────────────────────────────┐
│ openclaw gateway (真实数据源)             │
│   agents.* / agent.identity.* /          │
│   agents.files.* / skills.* / tools.*     │
└──────────────────────────────────────────┘
```

**原则:**

- kaiwu 只存 `agent_id` 三列索引, 不镜像 openclaw 字段
- 列表驱动器 = kaiwu `agents` 表(决定顺序和"认识"的 agent 集)
- 真实字段 = openclaw RPC 实时拉取
- tab 分区靠差集派生, 不入 DB

---

## 2. 数据模型

### 2.1 kaiwu 本地表

```ts
chatAgents = sqliteTable("agents", {
  agentId: text("agent_id").primaryKey(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})
```

仅此三列. 不存 name/model/workspace/identity —— 这些全去 openclaw 拉.

### 2.2 运行时派生状态 (不入 DB)

```ts
type AgentStatus = "mine" | "unsynced" | "missing"

// mine:     kaiwu.rows ∩ openclaw.agents  (双方都有)
// unsynced: openclaw.agents − kaiwu.rows  (网关有、本地未登记)
// missing:  kaiwu.rows − openclaw.agents  (本地有、网关无)
```

**判定前置条件:**

- gateway 未连接 → 全体视为 `unknown`, 不分 tab
- gateway 已连接 + `agents.list` 返回 0 条 → banner 警告 "网关为空, 禁用批量删除"
- gateway 已连接 + 非空 → 才做 3 路差集

---

## 3. RPC 扩展清单

### 3.1 kaiwu 主进程代理层 (已有)

- `openclaw.agents.list / create / update / delete`
- `openclaw.models.list`

### 3.2 需新增代理 (全部来自 openclaw 已存在的 RPC)

| 新增                              | openclaw RPC         | 用途                                 |
| --------------------------------- | -------------------- | ------------------------------------ |
| `openclaw.agents.identity`        | `agent.identity.get` | 获取完整 identity(name/avatar/emoji) |
| `openclaw.agents.files.list`      | `agents.files.list`  | workspace 文件清单                   |
| `openclaw.agents.files.get`       | `agents.files.get`   | 读文件内容                           |
| `openclaw.agents.files.set`       | `agents.files.set`   | 写文件内容                           |
| `openclaw.agents.skills.status`   | `skills.status`      | skill 开关状态                       |
| `openclaw.agents.tools.catalog`   | `tools.catalog`      | 工具目录(全拉, 暂不 UI)              |
| `openclaw.agents.tools.effective` | `tools.effective`    | 生效工具(全拉, 暂不 UI)              |

RPC 契约类型加到 `contracts/rpc.ts`, domain 加到 `domains/agents.ts`, bridge 加到 `api.ts`.

### 3.3 kaiwu feature 层 API (自己的业务 RPC)

| 方法                   | 入参                                                          | 返回                                      | 说明                                        |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| `agent.list`           | —                                                             | `{ mine, unsynced, missing }`             | 聚合: kaiwu DB + openclaw.list, 返回 3 分区 |
| `agent.create`         | `{ name, workspace, model?, emoji?, avatar? }`                | `{ agentId }`                             | 网关 create → kaiwu.insert; 网关失败即失败  |
| `agent.update`         | `{ agentId, name?, workspace?, model?, emoji?, avatar? }`     | `{ ok }`                                  | 网关 update → kaiwu.touch updatedAt         |
| `agent.delete`         | `{ agentId, deleteLocalFiles: boolean, alsoUnlink: boolean }` | `{ ok, removedBindings? }`                | 见下方 2 种删除策略                         |
| `agent.importUnsynced` | `{ agentIds: string[] }`                                      | `{ imported: number }`                    | 一键同步: 把 unsynced tab 行插 kaiwu        |
| `agent.detail`         | `{ agentId }`                                                 | `{ row, identity, files, skills, tools }` | 聚合 RPC: 详情页一次性拉全                  |
| `agent.files.get`      | `{ agentId, name }`                                           | `{ file }`                                | 转发                                        |
| `agent.files.set`      | `{ agentId, name, content }`                                  | `{ ok }`                                  | 转发                                        |

### 3.4 删除策略 (2 选 1)

| 选项              | 对 openclaw                              | 对 kaiwu             | UI 勾选                                                        |
| ----------------- | ---------------------------------------- | -------------------- | -------------------------------------------------------------- |
| **彻底删** (默认) | `agents.delete { agentId, deleteFiles }` | `DELETE FROM agents` | "删除网关 agent" ☑️ + "同时删除 workspace 磁盘文件" ☐ (用户勾) |
| **仅解除引用**    | 不动                                     | `DELETE FROM agents` | "仅从 kaiwu 移除引用" (这条之后 agent 流入 unsynced tab)       |

Dialog 布局草案:

```
┌───────────────────────────────┐
│ 删除 Agent: {name}            │
├───────────────────────────────┤
│ ○ 彻底删除 (网关 + 本地引用)   │
│   ☐ 同时删除 workspace 文件   │
│ ○ 仅从 kaiwu 移除引用          │
├───────────────────────────────┤
│      [取消]   [确认删除]      │
└───────────────────────────────┘
```

---

## 4. UI 设计

### 4.1 列表页 `/agent`

```
┌────────────────────────────────────────────────────────┐
│ [我的 (5)] [未同步 (2)] [已失联 (1)]    [+ 新建]       │
│                                                        │
│ ⚠ 未同步 tab: 发现 2 个网关 agent 未本地化            │
│   [一键同步]                                           │
│                                                        │
│ ┌──────┐ ┌──────┐ ┌──────┐                            │
│ │ card │ │ card │ │ card │ ...                        │
│ └──────┘ └──────┘ └──────┘                            │
└────────────────────────────────────────────────────────┘
```

- 3 个 Tab: `mine` / `unsynced` / `missing`
- `mine` 是默认选中
- `unsynced` tab 顶部显示 banner + "一键同步" 按钮
- `missing` tab 每张卡片有"从本地删除"动作 + 全局 banner 解释
- 卡片点击进 `/agent/:id`
- 进入页面时触发一次扫描 (对比 kaiwu + openclaw)

### 4.2 详情页 `/agent/:id`

**顶部 Header (按美学设计):**

```
┌────────────────────────────────────────────────────────┐
│ [← 返回]  [avatar/emoji]  agent-name    [model 徽章]   │
│                                          [default 徽章] │
└────────────────────────────────────────────────────────┘
```

- 左:返回按钮 (navigate("/agent"))
- 中:avatar/emoji + name (h1)
- 右:primary model chip + 可选 "default" 徽章

**4 个 Tab:**

| tab           | 数据源                      | 内容                                                                                                          | 操作                         |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Overview**  | `agent.detail`              | avatar/emoji / name / default 标记 / model primary + fallbacks chips / workspace 路径(可复制) / theme         | 点击 model 切换(跳 Settings) |
| **Workspace** | `agents.files.list/get/set` | 文件列表 + 编辑器 (MVP 支持 agents.json / soul.json / tools.json / identity.md / user.md / memory.json\|yaml) | 选文件 → 编辑 → 保存         |
| **Skills**    | `skills.status`             | skill 列表 + enabled 状态 + reasons                                                                           | MVP 只读; 后续加开关         |
| **Settings**  | `agents.update`             | name / primary model (select) / emoji / avatar 输入 + "删除"按钮                                              | 编辑提交 / 触发删除 dialog   |

**Workspace tab 编辑保护:**

- 仅允许 openclaw bootstrap 列表内的文件名 (agents.json, soul.json, tools.json, identity.md, user.md, heartbeat.json, bootstrap.json, memory.json, memory.yaml)
- 其他文件只读展示 name/size/mtime
- 编辑器 draft 态, 显式"保存"按钮

---

## 5. 流程

### 5.1 进入 list 页

```
1. useAgentList() → 并发 kaiwu.agent.list() + gateway 状态检测
2. 根据 gateway state 选支路:
   - disconnected → 显示 skeleton, tab 不切
   - empty        → banner 警告, 禁批量删
   - normal       → 3 分区渲染
3. 若 unsynced.length > 0 → tab badge + 顶部 banner
```

### 5.2 创建 agent

```
User 点 "+ 新建" → 弹 CreateAgentDialog
  ├── name (必填)
  ├── workspace (必填, 相对或绝对路径)
  ├── primary model (可选, 从 models.list 选)
  ├── emoji (可选)
  └── avatar (可选, path/URL/dataURI)

提交:
  1. RPC: openclaw.agents.create(params)
  2. 成功 → RPC: kaiwu agent.create 副作用 (insert agents 行)
  3. 失败 → toast error, 保持 dialog 打开
  4. 成功 → toast success "Agent 已创建", 关 dialog, refresh list
```

### 5.3 同步未登记 agent

```
User 点 unsynced tab 的 "一键同步":
  1. RPC: agent.importUnsynced({ agentIds: unsynced[].map(id) })
  2. 后端遍历 insert kaiwu.agents (INSERT OR IGNORE)
  3. toast success "已同步 N 个 agent"
  4. refresh list
```

### 5.4 删除 agent

```
User 点卡片/Settings 的 "删除":
  → DeleteAgentDialog (见 §3.4)
  → 用户选择策略 + 勾选 deleteFiles
  → 提交:
       策略 A (彻底):
         1. openclaw.agents.delete({ agentId, deleteFiles })
         2. kaiwu.agents delete row
       策略 B (仅解除):
         1. kaiwu.agents delete row
    → toast success
    → refresh list
```

### 5.5 修复 missing 行

```
missing tab 每行 → "从本地删除" 按钮:
  1. RPC: agent.delete({ agentId, strategy: "unlinkOnly" })
  2. kaiwu.agents delete row
  3. 不动 openclaw
```

---

## 6. 提示 (toast) 规约

所有 CRUD 必须 toast. 用 sonner.

| 动作            | 成功                  | 失败              |
| --------------- | --------------------- | ----------------- |
| create          | `Agent 已创建`        | `创建失败: {err}` |
| update          | `已保存`              | `保存失败: {err}` |
| delete (彻底)   | `Agent 已删除`        | `删除失败: {err}` |
| delete (仅解除) | `引用已解除`          | `操作失败: {err}` |
| importUnsynced  | `已同步 {n} 个 agent` | `同步失败: {err}` |
| workspace 保存  | `{filename} 已保存`   | `保存失败: {err}` |

i18n key 规则: `agent.toast.<action>.success / error`.

---

## 7. 文件结构

### 7.1 主进程

```
electron/features/openclaw/
├── contracts/rpc.ts              # 扩展: AgentIdentity 已在; 加 files/skills/tools 契约
├── domains/agents.ts             # 扩展: 加 identity/files/skills/tools 转发
└── api.ts                        # 扩展: agentsBridge 新 method

electron/features/agent/          # 新建 feature (kaiwu 侧业务)
├── types.ts                      # 业务类型 (AgentRow, AgentListResult, AgentDetail ...)
├── repository.ts                 # kaiwu agents 表 CRUD
├── service.ts                    # @Controller("agent") + @Handle 方法
├── bridge.ts                     # preload bridge
└── AGENTS.md                     # feature 说明

electron/database/schema.ts       # 加 agents 表
electron/preload.ts               # 挂 agent bridge
electron/app/ipc.ts               # 注册 AgentService
```

### 7.2 渲染进程

```
app/pages/agent/
├── list/
│   ├── index.tsx                 # 3 tab 容器
│   └── components/
│       ├── card.tsx              # 单张 agent 卡片 (已有雏形, 扩展)
│       ├── mine-tab.tsx          # 本地 ∩ 网关
│       ├── unsynced-tab.tsx      # 网关 − 本地 + 一键同步
│       └── missing-tab.tsx       # 本地 − 网关 + 解除引用
├── detail/
│   ├── index.tsx                 # header + tabs 容器
│   ├── hooks/
│   │   └── use-agent-detail.ts   # 聚合 RPC 拉取
│   └── components/
│       ├── header.tsx            # 返回按钮 + 名字 + 徽章
│       ├── overview-tab.tsx
│       ├── workspace-tab.tsx     # 文件列表 + 编辑器
│       ├── skills-tab.tsx
│       └── settings-tab.tsx
├── components/
│   ├── create-dialog.tsx         # 新建
│   └── delete-dialog.tsx         # 删除策略选择
├── hooks/
│   └── use-agents.ts             # list hook (已有, 扩展为 3 分区)
└── data.ts                       # BOOTSTRAP_FILES 白名单常量

app/stores/agent.ts               # (可选) 若列表状态需跨页共享; MVP 可先不做, hook 本地 state
```

---

## 8. 扩展点 (后续可接入但 MVP 不做)

| 扩展点                           | 位置                              | 场景                                       |
| -------------------------------- | --------------------------------- | ------------------------------------------ |
| Tools UI tab                     | `detail/components/tools-tab.tsx` | 已拉 `tools.catalog`, 后续做 UI            |
| Channels UI tab                  | 同上                              | openclaw channels 相关                     |
| Cron Jobs UI tab                 | 同上                              | 定时任务                                   |
| Skill 开关                       | `skills-tab.tsx` 加 toggle        | 需 openclaw 的 `skills.enable/disable` RPC |
| Workspace 高级文件               | 白名单外文件编辑                  | 需安全评估                                 |
| 本地元数据 (tags/favorite/notes) | 扩 `agents` 表字段                | 按需上升为 B/C 方案                        |

---

## 9. 非目标 (明确不做)

- Agent 本地存储**镜像 openclaw 字段** (永远只存 3 列索引)
- 后台定时扫描 (只在进 list 页触发)
- Agent 之间继承关系 UI
- Avatar 图片本地上传 (只做 URL/dataURI 透传)
- Workspace 路径修改 (openclaw 支持, 但相当于搬家, MVP 不开放)

---

## 10. MVP 验收标准

1. kaiwu 启动后 agents 表自动建表
2. 进 `/agent` → 正确显示 3 个 tab, 数据通过网关
3. 新建 agent → 网关成功 + kaiwu 插入 + toast + 刷新
4. 进详情页 → 4 tab 齐全, Workspace tab 可读 + 可写白名单文件
5. Skills tab 能显示 skill 状态
6. 删除 agent → dialog 2 策略可选, 勾选 deleteFiles 正确传参
7. unsynced tab "一键同步"有效
8. missing tab "解除引用"只删本地
9. 所有 CRUD 有 toast
10. gateway 断连 → 列表友好降级, 不误判 missing
