# Agent 管理

## 定位

查看和管理当前 theme 下注册的所有 Agent。实时展示 Agent 状态（在线/离线/忙碌），查看详情、Token 消耗、会话历史。

## 路由

```
/agents              → Agent 列表页
/agents/[id]         → Agent 详情页
```

## 列表页结构

```
┌─────────────────────────────────────────────────────────────┐
│  Agent 管理                             [卡片视图|列表视图]  │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ ● 在线       │ │ ● 在线       │ │ ○ 离线       │          │
│  │ Agent名称    │ │ Agent名称    │ │ Agent名称    │          │
│  │ 阶段: 执行   │ │ 阶段: 规划   │ │ 阶段: 审核   │          │
│  │ 角色: 代码   │ │ 角色: —      │ │ 角色: —      │          │
│  │              │ │              │ │              │          │
│  │ 最后活跃     │ │ 最后活跃     │ │ 最后活跃     │          │
│  │ 2分钟前      │ │ 刚刚         │ │ 3小时前      │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ...                        │
└─────────────────────────────────────────────────────────────┘
```

## 组件拆分

```
app/(dashboard)/agents/
├── page.tsx                          ← Server Component
├── queries.ts
└── components/
    ├── AgentGrid.tsx                 ← Client Component（卡片网格，接收实时状态）
    ├── AgentCard.tsx                 ← 单个 Agent 卡片
    └── AgentStatusBadge.tsx          ← 状态徽章（在线/离线/忙碌）
```

## 数据源

### DB 数据（Server Component 查询）

```ts
// queries.ts
async function getAgents(themeId: number): Promise<Agent[]> {
  return db.query.agents.findMany({ where: eq(agents.themeId, themeId), orderBy: (t, { asc }) => [asc(t.sortOrder)] })
}
```

返回：id, stageType, subRole, isEnabled, config

### 实时状态（WebSocket 推送）

Gateway `tick` 事件包含 Agent 会话状态：

```ts
interface AgentRealtimeStatus {
  id: string
  status: "online" | "offline" | "busy"
  lastSeen: string // ISO timestamp
  currentTask?: string // 正在执行的任务
}
```

AgentGrid 是 Client Component，合并 DB 数据（props 传入）和实时状态（Zustand store 订阅）。

## AgentCard 设计

```
┌───────────────────────┐
│  ● 状态灯  Agent名称  │
│                         │
│  阶段    执行           │
│  角色    代码实现       │
│  模型    Claude Sonnet  │
│                         │
│  最后活跃  2分钟前      │
│  今日消耗  3.2K tokens  │
└───────────────────────┘
```

```tsx
interface AgentCardProps {
  agent: { id: string; stageType: string; subRole: string | null; isEnabled: boolean; config: Record<string, unknown> }
  stageLabel: string // 从 pipeline 映射的中文名
  realtimeStatus?: AgentRealtimeStatus
}
```

状态灯颜色：

- `online` → 绿色 + pulse 动画
- `busy` → 琥珀色
- `offline` → 灰色

## 响应式

| 断点 | 卡片网格                                                            |
| ---- | ------------------------------------------------------------------- |
| 手机 | 单列                                                                |
| 平板 | 2 列                                                                |
| 桌面 | 3-4 列 (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) |

## 列表视图

切换到表格模式：

| Agent    | 阶段 | 角色 | 状态   | 最后活跃 | 今日消耗 |
| -------- | ---- | ---- | ------ | -------- | -------- |
| zhongshu | 规划 | —    | ● 在线 | 刚刚     | 5.1K     |
| bingbu   | 执行 | 代码 | ● 忙碌 | 正在执行 | 8.3K     |

移动端表格隐藏部分列，只保留：Agent、状态、最后活跃。

---

# Agent 详情页

## 路由

```
/agents/[id]
```

## 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  ← 返回  Agent名称  ● 在线                    [启用/禁用]  │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 基本信息                                              │    │
│  │ 阶段: 执行  |  角色: 代码  |  模型: Claude Sonnet    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─── 会话历史 ─── Token 消耗 ─── SOUL 配置 ───┐           │
│  │                                                 │           │
│  │  [当前标签页内容]                               │           │
│  │                                                 │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 会话历史 Tab

从 Gateway 获取该 Agent 的历史会话列表：

- 会话 ID、开始时间、持续时长、Token 消耗
- 点击展开查看会话日志

### Token 消耗 Tab

- 日/周/月维度折线图（Recharts）
- Input/Output token 分布饼图
- 总消耗统计

### SOUL 配置 Tab

只读展示 Agent 的 SOUL.md 内容（从模板读取或从 workspace 读取），Markdown 渲染。
