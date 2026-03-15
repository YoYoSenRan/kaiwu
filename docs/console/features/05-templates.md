# 模板管理

## 定位

列出 `@kaiwu/templates` 中的所有可用模板，预览内容，一键初始化部署到 OpenClaw 运行时。

## 路由

```
/templates            → 模板列表页
/templates/[slug]     → 模板详情预览
```

## 列表页

```
┌─────────────────────────────────────────────────────────────┐
│  模板管理                                                     │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  三省六部                                    [已激活]   │  │
│  │  以中国唐代三省六部制为骨架的多 Agent 协作体系          │  │
│  │  v1.0.0  ·  11 个 Agent  ·  6 个阶段                  │  │
│  │                                         [查看] [重部署] │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  (未来模板)                                   [未安装]  │  │
│  │  描述文字                                               │  │
│  │  v1.0.0  ·  N 个 Agent  ·  M 个阶段                   │  │
│  │                                         [查看] [初始化] │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 组件拆分

```
app/(dashboard)/templates/
├── page.tsx                          ← Server Component
├── queries.ts                        ← 查询已激活 theme + 模板列表
├── actions.ts                        ← initializeTemplate Server Action
└── components/
    ├── TemplateList.tsx              ← 模板列表
    ├── TemplateCard.tsx              ← 单个模板卡片
    └── InitializeButton.tsx          ← 初始化按钮（Client，有 loading 状态）
```

## 数据源

```ts
// queries.ts
import { listTemplates } from "@kaiwu/templates"

async function getTemplatesWithStatus(): Promise<TemplateWithStatus[]> {
  const [templates, activeTheme] = await Promise.all([listTemplates(), db.query.themes.findFirst({ where: eq(themes.isActive, true) })])

  return templates.map((t) => ({
    ...t,
    isActive: activeTheme?.slug === t.slug,
    isInstalled: activeTheme?.slug === t.slug, // 暂时简化，后续可查 agents 表
  }))
}
```

## 初始化 Server Action

```ts
// actions.ts
"use server"

import { initializeTemplate } from "@kaiwu/openclaw"
import { loadManifest } from "@kaiwu/templates"

async function deployTemplate(slug: string): Promise<ActionResult> {
  // 1. 初始化文件系统（workspace + SOUL.md + openclaw.json）
  const result = await initializeTemplate(slug, { skipRestart: false })

  // 2. 写入 DB（themes + pipelines + agents）
  const manifest = await loadManifest(slug)
  await upsertTheme(manifest)
  await upsertPipelines(manifest)
  await upsertAgents(manifest)

  // 3. 标记为激活
  await activateTheme(slug)

  revalidatePath("/templates")
  revalidatePath("/")
  return { success: true, data: result }
}
```

## 详情预览页

```
┌─────────────────────────────────────────────────────────────┐
│  ← 返回  三省六部  v1.0.0                      [初始化]    │
│                                                                │
│  描述文字                                                      │
│                                                                │
│  ┌─── Pipeline ─── Agent 列表 ─── 权限矩阵 ───┐            │
│  │                                               │            │
│  │  Pipeline 标签页：                            │            │
│  │  阶段可视化流程图                             │            │
│  │  阶段1 → 阶段2 → 阶段3 → ... → 阶段N       │            │
│  │                                               │            │
│  │  Agent 列表标签页：                           │            │
│  │  ID     | 阶段   | 角色   | 描述             │            │
│  │  taizi  | triage | —      | 消息分拣          │            │
│  │  ...                                          │            │
│  │                                               │            │
│  │  权限矩阵标签页：                             │            │
│  │  From ↓ \ To → | zhongshu | menxia | ...     │            │
│  │  taizi          |    ✅    |   ❌   | ...     │            │
│  │  ...                                          │            │
│  └───────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

数据全部来自 `loadManifest(slug)`，不需要查 DB。

## 响应式

| 断点 | 模板卡片                 | 详情预览       |
| ---- | ------------------------ | -------------- |
| 手机 | 单列                     | 标签页纵向堆叠 |
| 桌面 | 单列（卡片本身横向展开） | 标签页正常     |

模板卡片始终单列——模板数量不多，不需要网格布局。
