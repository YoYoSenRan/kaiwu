# Dashboard 首页

## 定位

Console 的第一屏，系统级概览。用户打开 Console 后第一眼看到的信息：Gateway 是否正常、有多少 Agent 在跑、当前有哪些任务在流转、今天花了多少钱。

## 路由

```
/                → (dashboard)/page.tsx
```

## 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                                    │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Gateway  │ │ Agent    │ │ 活跃任务 │ │ 今日消耗 │        │
│  │ 状态     │ │ 在线数   │ │ 数量     │ │ Token    │        │
│  │ ● 已连接 │ │ 8/11     │ │ 3        │ │ 12.4K    │        │
│  │ 延迟 12ms│ │          │ │          │ │ ≈$0.42   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                │
│  ┌────────────────────────────┐ ┌──────────────────────────┐  │
│  │ Pipeline 概览               │ │ 最近活动                │  │
│  │                              │ │                          │  │
│  │  阶段1  阶段2  阶段3  ...  │ │  10:32  Agent X 完成任务 │  │
│  │  ██ 2   ██ 1   ██ 3       │ │  10:28  任务 Y 进入审核  │  │
│  │                              │ │  10:15  Agent Z 上线     │  │
│  │                              │ │  ...                     │  │
│  └────────────────────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 组件拆分

```
app/(dashboard)/page.tsx              ← Server Component，获取数据
app/(dashboard)/components/
├── StatCards.tsx                      ← 顶部统计卡片网格
├── PipelineOverview.tsx              ← Pipeline 阶段分布（柱状图）
└── RecentActivity.tsx                ← 最近事件时间线
```

## 数据源

### StatCards

| 卡片         | 数据源                               | 查询方式                             |
| ------------ | ------------------------------------ | ------------------------------------ |
| Gateway 状态 | Zustand store（WebSocket）           | Client Component 订阅 `useGateway()` |
| Agent 在线数 | Zustand store（WebSocket tick 事件） | Client Component                     |
| 活跃任务数   | DB `productions` 表                  | Server Component 直查                |
| 今日消耗     | DB `productionEvents` 或 Gateway     | 待定（取决于 Token 数据来源）        |

```ts
// queries.ts
async function getActiveProductionCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(productions)
    .where(notInArray(productions.status, ["done", "cancelled"]))
  return Number(result[0].count)
}
```

### PipelineOverview

从 DB 聚合当前 theme 下每个 pipeline 阶段的 production 数量：

```ts
async function getPipelineDistribution(themeId: number): Promise<PipelineStat[]> {
  return db
    .select({ stageType: pipelines.stageType, label: pipelines.label, color: pipelines.color, emoji: pipelines.emoji, count: count(productions.id) })
    .from(pipelines)
    .leftJoin(productions, eq(productions.currentStage, pipelines.stageType))
    .where(eq(pipelines.themeId, themeId))
    .groupBy(pipelines.id)
    .orderBy(pipelines.sortOrder)
}
```

### RecentActivity

从 `productionEvents` 取最近 10 条：

```ts
async function getRecentEvents(limit = 10): Promise<ProductionEvent[]> {
  return db.query.productionEvents.findMany({ orderBy: (t, { desc }) => [desc(t.createdAt)], limit })
}
```

## 响应式

| 断点 | StatCards | Pipeline + Activity |
| ---- | --------- | ------------------- |
| 手机 | 2×2 网格  | 纵向堆叠            |
| 平板 | 4×1 横排  | 纵向堆叠            |
| 桌面 | 4×1 横排  | 左右分栏（6:4）     |

## StatCard 组件接口

```tsx
interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: { value: number; label: string } // 可选趋势指标
}
```

## Gateway 状态卡片

这是唯一一个需要 Client Component 的 StatCard：

```tsx
"use client"

function GatewayStatCard() {
  const { status, latency } = useGateway()

  const statusConfig = {
    connected: { label: "已连接", color: "text-green-500", icon: Wifi },
    connecting: { label: "连接中", color: "text-yellow-500", icon: Loader2 },
    reconnecting: { label: "重连中", color: "text-yellow-500", icon: Loader2 },
    disconnected: { label: "未连接", color: "text-red-500", icon: WifiOff },
  }

  return <StatCard title="Gateway" value={statusConfig[status].label} description={latency ? `延迟 ${latency}ms` : undefined} icon={statusConfig[status].icon} />
}
```
