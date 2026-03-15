# 数据表格 + 分页模板（Next.js App Router）

## 核心思路：URL 驱动，而不是 useState

Next.js 全栈项目中，分页/筛选状态应该放在 **URL searchParams**，而不是 React state。
好处：SSR 直出内容、可刷新/书签保存、无数据闪烁。

## 标准结构

```
src/app/(dashboard)/[feature]/
├── page.tsx            ← Server Component，读 searchParams，查数据
├── queries.ts          ← 查询函数（直连 db）
└── components/
    ├── XxxTable.tsx    ← 纯展示组件（可以是 Server Component）
    └── XxxPagination.tsx ← 分页导航（Client Component，生成 Link）
    └── XxxSearch.tsx   ← 搜索栏（Client Component，修改 URL）
```

## page.tsx 模板

```tsx
import { XxxTable } from "./components/XxxTable"
import { XxxSearch } from "./components/XxxSearch"
import { XxxPagination } from "./components/XxxPagination"
import { getXxxList } from "./queries"

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function XxxListPage({ searchParams }: PageProps) {
  const { page = "1", q } = await searchParams
  const { items, total } = await getXxxList({ page: Number(page), keyword: q, pageSize: 20 })

  return (
    <div className="container py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">XXX 列表</h1>
      </div>
      <XxxSearch defaultKeyword={q} />
      <XxxTable data={items} />
      <XxxPagination currentPage={Number(page)} total={total} pageSize={20} />
    </div>
  )
}
```

## XxxSearch.tsx（Client Component — 只负责修改 URL）

```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"

export function XxxSearch({ defaultKeyword }: { defaultKeyword?: string }) {
  const router = useRouter()

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get("q") as string
    router.push(`?q=${encodeURIComponent(q)}&page=1`)
  }

  return (
    <form onSubmit={onSearch} className="mb-4 flex gap-2">
      <input name="q" defaultValue={defaultKeyword} placeholder="搜索..." />
      <button type="submit">搜索</button>
    </form>
  )
}
```

## XxxPagination.tsx（Client Component — 生成 Link，不 fetch）

```tsx
"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface PaginationProps {
  currentPage: number
  total: number
  pageSize: number
}

export function XxxPagination({ currentPage, total, pageSize }: PaginationProps) {
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  function getPageHref(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    return `?${params.toString()}`
  }

  return (
    <div className="mt-4 flex justify-end gap-2">
      {currentPage > 1 && <Link href={getPageHref(currentPage - 1)}>上一页</Link>}
      <span>
        {currentPage} / {totalPages}
      </span>
      {currentPage < totalPages && <Link href={getPageHref(currentPage + 1)}>下一页</Link>}
    </div>
  )
}
```

## queries.ts 模板

```ts
import { db } from "@kaiwu/db"

export async function getXxxList(params: { page: number; pageSize: number; keyword?: string }) {
  const offset = (params.page - 1) * params.pageSize

  const [items, [{ count }]] = await Promise.all([
    db.query.xxx.findMany({ limit: params.pageSize, offset, orderBy: (t, { desc }) => [desc(t.createdAt)] }),
    db.select({ count: count() }).from(xxx),
  ])

  return { items, total: Number(count) }
}
```

## ❌ 不推荐的方式（SPA 模式）

```tsx
// ❌ 不要这样做 — 在 Client Component 里 fetch 分页
"use client"
const [data, setData] = useState([])
const [page, setPage] = useState(1)

useEffect(() => {
  fetch(`/api/xxx?page=${page}`)
    .then((r) => r.json())
    .then(setData)
}, [page])
```

这种方式在 Next.js 全栈项目中会失去 SSR、闪烁、SEO 不友好，应当避免。
客户端 fetch 分页仅在「不需要 URL 感知」且「交互体验要求高」时才使用（如无限滚动）。
