# 成本追踪

## 定位

追踪 Token 消耗和成本，按 Agent、按模型、按时间维度分析，帮助优化资源使用。

## 路由

```
/costs                → 成本总览
```

## 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  成本追踪                          [今日|本周|本月] [导出▾] │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 总 Token │ │ 总成本   │ │ 请求次数 │ │ 平均每次 │        │
│  │ 142.8K   │ │ $4.82    │ │ 387      │ │ 369 tok  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                │
│  ┌─── 按 Agent ─── 按模型 ─── 趋势 ───┐                    │
│  │                                       │                    │
│  │  [当前标签页内容]                     │                    │
│  │                                       │                    │
│  └───────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## 组件拆分

```
app/(dashboard)/costs/
├── page.tsx                          ← Server Component
├── queries.ts                        ← 聚合查询
└── components/
    ├── CostStatCards.tsx             ← 顶部统计卡片
    ├── CostByAgent.tsx              ← 按 Agent 拆分（表格 + 饼图）
    ├── CostByModel.tsx              ← 按模型拆分（表格 + 饼图）
    ├── CostTrend.tsx                ← 趋势折线图（Recharts）
    └── CostExport.tsx               ← 导出按钮（CSV/JSON）
```

## 数据源

Token 消耗数据来源取决于 OpenClaw Gateway 提供什么：

### 方案 A：Gateway 直接提供（推荐）

Gateway `tick` 事件或专用 API 返回 Agent 级别的 Token 统计。Console 缓存到 Zustand store 并写入 DB 做历史记录。

### 方案 B：从 productionEvents 聚合

每次 Agent 输出都记录在 `productionEvents` 中，payload 包含 token 计数。

```ts
// queries.ts
interface CostSummary {
  totalTokens: number
  totalCost: number
  requestCount: number
  avgTokensPerRequest: number
}

interface AgentCost {
  agentId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  requestCount: number
}

async function getCostSummary(timeRange: TimeRange): Promise<CostSummary> { ... }
async function getCostByAgent(timeRange: TimeRange): Promise<AgentCost[]> { ... }
async function getCostByModel(timeRange: TimeRange): Promise<ModelCost[]> { ... }
async function getCostTrend(timeRange: TimeRange, granularity: "hour" | "day"): Promise<TrendPoint[]> { ... }
```

## 时间范围

URL searchParams 驱动：

```
/costs?range=today          ← 今日
/costs?range=week           ← 本周
/costs?range=month          ← 本月
/costs?range=custom&from=2026-03-01&to=2026-03-15
```

## 按 Agent 拆分

```
┌───────────────────────────────────────────────────────────┐
│  按 Agent                                                  │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │                          │  │ Agent     | Token | 占比 │ │
│  │      饼图                │  │ bingbu    | 42.1K | 29% │ │
│  │   Agent 成本分布        │  │ zhongshu  | 28.3K | 20% │ │
│  │                          │  │ gongbu    | 21.7K | 15% │ │
│  │                          │  │ menxia    | 18.2K | 13% │ │
│  └─────────────────────────┘  │ ...                      │ │
│                                └─────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

表格可展开行，展开后显示该 Agent 的模型级别明细（input/output token 比例）。

## 趋势图

Recharts 折线图：

- X 轴：时间
- Y 轴：Token 数量（左）/ 成本（右）
- 多条线：总量、top 3 Agent 分别一条
- 支持缩放和 tooltip

## 导出

Server Action 生成 CSV/JSON，浏览器下载：

```ts
// actions.ts
"use server"

async function exportCosts(format: "csv" | "json", range: TimeRange): Promise<{ url: string }> {
  const data = await getCostByAgent(range)
  // 生成文件，返回下载 URL
}
```

## 响应式

| 断点 | StatCards | 饼图+表格                  | 趋势图           |
| ---- | --------- | -------------------------- | ---------------- |
| 手机 | 2×2       | 纵向堆叠（饼图上，表格下） | 全宽，高度 200px |
| 桌面 | 4×1       | 左右分栏（饼图左，表格右） | 全宽，高度 300px |

## 成本计算

Token 价格参考（可配置在 settings 表）：

| 模型          | Input ($/1M) | Output ($/1M) |
| ------------- | ------------ | ------------- |
| Claude Sonnet | $3.00        | $15.00        |
| Claude Haiku  | $0.25        | $1.25         |
| Claude Opus   | $15.00       | $75.00        |

Console 不硬编码价格，从 settings 或 Gateway 配置读取。
