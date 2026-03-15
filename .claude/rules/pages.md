# 页面目录结构规范（Next.js App Router）

## 路由目录结构

```
src/app/(dashboard)/[feature]/
├── page.tsx          # 页面入口（Server Component）
├── layout.tsx        # 可选：该功能区布局
├── loading.tsx       # 可选：Suspense 占位
├── error.tsx         # 可选：Error Boundary（必须是 Client Component）
├── not-found.tsx     # 可选：notFound() 触发时展示
├── actions.ts        # Server Action（数据变更）
├── queries.ts        # 数据查询（服务端调用）
├── components/       # 仅当前路由用到的组件
│   ├── XxxTable.tsx  # 可以是 Client Component
│   └── XxxForm.tsx
└── [id]/             # 动态子路由
    ├── page.tsx
    └── ...
```

## page.tsx 规则

1. **默认是 Server Component**，不加 `'use client'`
2. **只做三件事**：获取数据、配置 metadata、组装布局，< 80 行
3. **分页/筛选状态放 searchParams**，而不是 useState

```tsx
// ✅ 正确：searchParams 驱动分页
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const { page = "1", q } = await searchParams
  const data = await getUsers({ page: Number(page), keyword: q })

  return (
    <div className="container py-6">
      <h1 className="mb-4 text-2xl font-bold">用户管理</h1>
      <UserTable data={data} currentPage={Number(page)} />
    </div>
  )
}

export const metadata = { title: "用户管理 | Kaiwu" }
```

## 特殊文件规范

### loading.tsx

页面数据加载时的骨架屏，自动包裹在 Suspense 中：

```tsx
export default function Loading() {
  return <div className="animate-pulse space-y-4">...</div>
}
```

### error.tsx（必须是 Client Component）

```tsx
"use client"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>出错了：{error.message}</p>
      <button onClick={reset}>重试</button>
    </div>
  )
}
```

### not-found.tsx

在服务端调用 `notFound()` 时渲染：

```tsx
import { notFound } from "next/navigation"

// 在 queries.ts 或 page.tsx 中
const user = await getUser(id)
if (!user) notFound() // 自动渲染 not-found.tsx
```

## Server 与 Client 组件决策

| 需要                               | 用哪种                             |
| ---------------------------------- | ---------------------------------- |
| 获取数据库数据                     | Server Component                   |
| 配置 metadata                      | Server Component                   |
| onClick / onChange 等事件          | Client Component（`'use client'`） |
| useState / useEffect               | Client Component                   |
| 浏览器 API（window、localStorage） | Client Component                   |
| 只读展示，无交互                   | Server Component（默认）           |

**原则**：默认 Server Component，只把需要交互的最小单元标记为 Client Component。
