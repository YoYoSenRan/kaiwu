# Server Component 页面模板

## 使用场景

数据展示类页面，以 React Server Component 为主，数据在服务端直接获取。

## 标准结构

```
src/app/(dashboard)/[feature]/
├── page.tsx        ← 入口，只做布局+获取数据
├── queries.ts      ← 查询函数
└── components/
    └── XxxView.tsx  ← 展示组件（可以是 Client Component）
```

## page.tsx 模板

```tsx
import { Suspense } from "react"
import { XxxView } from "./components/XxxView"
import { queryXxx } from "./queries"

export const metadata = { title: "XXX | Kaiwu Console" }

export default async function XxxPage() {
  const data = await queryXxx()

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">XXX 标题</h1>
        <p className="text-muted-foreground">页面说明</p>
      </div>

      <Suspense fallback={<div>加载中...</div>}>
        <XxxView data={data} />
      </Suspense>
    </div>
  )
}
```

## queries.ts 模板

```ts
import { db } from "@kaiwu/db"

export async function queryXxx() {
  return db.query.xxx.findMany({ orderBy: (table, { desc }) => [desc(table.createdAt)] })
}
```
