# 生产看板（Kanban）

## 定位

核心工作台。将 `productions` 表的数据按 Pipeline 阶段可视化为 Kanban 看板，实时展示每个任务在流程中的位置。

## 路由

```
/productions          → 看板列表页
/productions/[id]     → 生产详情页
```

## 通用化

看板的列不是硬编码的"太子→中书省→门下省"，而是从 DB `pipelines` 表动态读取。不同 theme 有不同的阶段配置。

```ts
// 从 DB 读取当前 theme 的 pipeline 阶段
const stages = await db.query.pipelines.findMany({ where: eq(pipelines.themeId, activeThemeId), orderBy: (t, { asc }) => [asc(t.sortOrder)] })
// stages = [{ label: "太子", stageType: "triage", color: "#e8a040", emoji: "🤴" }, ...]
// 但 Console 代码里不知道"太子"是什么，只知道这是第一个阶段
```

## 看板页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  看板                                     [+ 新建] [筛选▾]  │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ...    │
│  │ 🤴 阶段1 │ │ 📜 阶段2 │ │ 🔍 阶段3 │ │ 📮 阶段4 │        │
│  │ (2)      │ │ (1)      │ │ (0)      │ │ (3)      │        │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │
│  │ ┌──────┐ │ │ ┌──────┐ │ │          │ │ ┌──────┐ │        │
│  │ │Card A│ │ │ │Card C│ │ │  空状态  │ │ │Card D│ │        │
│  │ └──────┘ │ │ └──────┘ │ │          │ │ └──────┘ │        │
│  │ ┌──────┐ │ │          │ │          │ │ ┌──────┐ │        │
│  │ │Card B│ │ │          │ │          │ │ │Card E│ │        │
│  │ └──────┘ │ │          │ │          │ │ └──────┘ │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 组件拆分

```
app/(dashboard)/productions/
├── page.tsx                          ← Server Component，读取 stages + productions
├── queries.ts                        ← 数据查询
└── components/
    ├── KanbanBoard.tsx               ← Client Component，看板容器（横向滚动）
    ├── KanbanColumn.tsx              ← 单列（阶段标题 + 卡片列表）
    ├── ProductionCard.tsx            ← 任务卡片
    └── ProductionFilters.tsx         ← 筛选栏（状态、优先级）
```

## 数据查询

### queries.ts

```ts
import { db } from "@kaiwu/db"

interface KanbanData {
  stages: PipelineStage[]
  productions: ProductionWithAgent[]
}

async function getKanbanData(themeId: number): Promise<KanbanData> {
  const [stages, productions] = await Promise.all([
    db.query.pipelines.findMany({ where: eq(pipelines.themeId, themeId), orderBy: (t, { asc }) => [asc(t.sortOrder)] }),
    db.query.productions.findMany({ where: notInArray(productions.status, ["done", "cancelled"]), with: { agent: true }, orderBy: (t, { desc }) => [desc(t.updatedAt)] }),
  ])
  return { stages, productions }
}
```

### page.tsx

```tsx
export default async function ProductionsPage() {
  const activeTheme = await getActiveTheme()
  if (!activeTheme) redirect("/templates") // 没有激活的主题，先去初始化模板

  const { stages, productions } = await getKanbanData(activeTheme.id)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">看板</h1>
        <ProductionFilters />
      </div>
      <KanbanBoard stages={stages} productions={productions} />
    </div>
  )
}
```

## ProductionCard 设计

```
┌─────────────────────────┐
│ ● 优先级色条              │
│                           │
│  任务标题（最多2行）      │
│                           │
│  🤖 Agent名  ·  2小时前  │
│  [标签1] [标签2]          │
└─────────────────────────┘
```

```tsx
interface ProductionCardProps {
  production: { id: number; title: string; status: string; priority: string; currentStage: string; updatedAt: Date; agent?: { id: string; stageType: string } }
}
```

优先级色条：

- `urgent` → `border-l-4 border-red-500`
- `high` → `border-l-4 border-orange-500`
- `normal` → `border-l-4 border-blue-500`
- `low` → `border-l-4 border-gray-400`

## 响应式

| 断点 | 行为                                 |
| ---- | ------------------------------------ |
| 手机 | 看板列纵向堆叠为手风琴，每次展开一列 |
| 平板 | 横向滚动，列宽 `min-w-[280px]`       |
| 桌面 | 横向排列，列自适应宽度               |

移动端替代方案：列表视图，按阶段分组折叠。

## 交互

- 点击卡片 → 跳转 `/productions/[id]` 详情页
- 筛选：按优先级、按阶段过滤（URL searchParams 驱动）
- 暂不做拖拽（第一版用按钮推进状态，第二版加拖拽）

---

# 生产详情页

## 路由

```
/productions/[id]     → 详情页
```

## 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  ← 返回看板     任务标题                        [操作按钮▾] │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 阶段进度条                                            │    │
│  │ ●──────●──────●──────○──────○──────○                 │    │
│  │ 阶段1  阶段2  阶段3  阶段4  阶段5  阶段6             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─── 详情 ─── 子任务 ─── 事件流 ───┐                       │
│  │                                     │                       │
│  │  [当前标签页内容]                   │                       │
│  │                                     │                       │
│  └─────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## 组件拆分

```
app/(dashboard)/productions/[id]/
├── page.tsx                          ← Server Component
├── queries.ts
└── components/
    ├── StageProgress.tsx             ← 阶段进度条
    ├── ProductionDetail.tsx          ← 基本信息
    ├── TaskTree.tsx                  ← 子任务树（productionTasks）
    ├── EventTimeline.tsx             ← 事件流（productionEvents）
    └── ProductionActions.tsx         ← 操作按钮（推进、取消、阻塞）
```

## 操作（Server Action）

```ts
// actions.ts
"use server"

async function advanceStage(productionId: number, nextStage: string): Promise<ActionResult>
async function cancelProduction(productionId: number, reason: string): Promise<ActionResult>
async function blockProduction(productionId: number, reason: string): Promise<ActionResult>
async function unblockProduction(productionId: number): Promise<ActionResult>
```

## 状态机约束

Production 状态流转必须遵循 DB schema 中定义的状态机：

```
triage → planning → review ↻ → dispatch → executing → publishing → done
任何状态 → cancelled
任何状态 → blocked → 恢复到之前状态
review → rejected → planning（回退重做）
```

Console 不硬编码这些规则，从 DB 或配置读取允许的状态转换。
