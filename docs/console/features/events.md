# 事件日志

## 定位

全量事件流浏览器。查看 `productionEvents` 表中的所有事件，支持筛选、搜索、详情展开。用于调试和审计。

## 路由

```
/events               → 事件列表页
/events?topic=stage.changed&producer=system    ← URL 驱动筛选
```

## 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  事件日志                                                     │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔍 搜索事件...   [Topic ▾] [Producer ▾] [时间范围 ▾]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 10:32:15  stage.changed    system         #prod-42      │ │
│  │ 10:28:03  agent.output     agent.bingbu   #prod-42      │ │
│  │ 10:15:47  task.progress    agent.shangshu #prod-41      │ │
│  │ 10:12:22  production.created  system      #prod-42      │ │
│  │ ...                                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ← 上一页  第 1 / 24 页  下一页 →                              │
└─────────────────────────────────────────────────────────────┘
```

## 组件拆分

```
app/(dashboard)/events/
├── page.tsx                          ← Server Component
├── queries.ts                        ← 带筛选的分页查询
└── components/
    ├── EventFilters.tsx              ← Client Component，筛选栏
    ├── EventList.tsx                 ← 事件列表
    ├── EventRow.tsx                  ← 单行，可展开查看 payload
    └── EventPagination.tsx           ← 分页导航
```

## 数据查询

```ts
// queries.ts
interface EventQuery {
  page: number
  pageSize: number
  topic?: string
  producer?: string
  productionId?: number
  from?: Date
  to?: Date
  search?: string
}

async function getEvents(query: EventQuery): Promise<{ items: ProductionEvent[]; total: number }> {
  const conditions = []
  if (query.topic) conditions.push(eq(productionEvents.topic, query.topic))
  if (query.producer) conditions.push(eq(productionEvents.producer, query.producer))
  if (query.productionId) conditions.push(eq(productionEvents.productionId, query.productionId))
  if (query.from) conditions.push(gte(productionEvents.createdAt, query.from))
  if (query.to) conditions.push(lte(productionEvents.createdAt, query.to))

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const offset = (query.page - 1) * query.pageSize

  const [items, [{ count: total }]] = await Promise.all([
    db.query.productionEvents.findMany({ where, limit: query.pageSize, offset, orderBy: (t, { desc }) => [desc(t.createdAt)] }),
    db.select({ count: count() }).from(productionEvents).where(where),
  ])

  return { items, total: Number(total) }
}
```

## 事件行设计

紧凑行，点击展开 payload：

```
  10:32:15  [stage.changed]  system  #prod-42  "从 planning 变更为 review"
            ▼ 展开
            {
              "productionId": 42,
              "fromStage": "planning",
              "toStage": "review",
              "triggeredBy": "agent.menxia"
            }
```

## Topic 枚举

从 DB 动态聚合，不硬编码：

```ts
async function getTopicOptions(): Promise<string[]> {
  const result = await db.selectDistinct({ topic: productionEvents.topic }).from(productionEvents)
  return result.map((r) => r.topic)
}
```

## 响应式

| 断点 | 筛选栏                          | 事件列表                                      |
| ---- | ------------------------------- | --------------------------------------------- |
| 手机 | 折叠为「筛选」按钮 → 底部 Sheet | 简化列（时间+topic+producer）                 |
| 桌面 | 内联一排                        | 完整列（时间+topic+producer+production+摘要） |

## 分页

URL searchParams 驱动：

```
/events?page=2&topic=stage.changed&pageSize=50
```

默认每页 50 条。
