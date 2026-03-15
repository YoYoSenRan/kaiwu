# 数据获取与变更规范（Next.js App Router 全栈）

## 决策树：用哪种方式？

```
需要数据？
├── 服务端渲染时获取（页面加载） → Server Component 直接查询（最优）
└── 用户交互触发
    ├── 数据变更（增删改）        → Server Action（最优）
    ├── 分页/筛选，需要 URL 感知  → URL searchParams + Server Component（最优）
    └── 特殊场景（见下方）         → Route Handler
```

**Route Handler 仅适用于以下场景**：

- 外部系统的 Webhook 回调
- 文件上传（multipart）
- 需要返回非 JSON 响应（流式、二进制）
- 第三方无法调用 Server Action 的情况

---

## 1. Server Component 直接查询（读取数据）

```ts
// app/(dashboard)/users/queries.ts
import { db } from "@kaiwu/db"

export async function getUsers(params: { page: number; keyword?: string }) {
  return db.query.users.findMany({
    where: params.keyword ? like(users.name, `%${params.keyword}%`) : undefined,
    limit: 20,
    offset: (params.page - 1) * 20,
    orderBy: [desc(users.createdAt)],
  })
}
```

```tsx
// app/(dashboard)/users/page.tsx - Server Component，无需 useEffect/fetch
export default async function UsersPage({ searchParams }) {
  const { page = "1", q } = await searchParams
  const users = await getUsers({ page: Number(page), keyword: q })

  return <UserTable data={users} />
}
```

---

## 2. Server Action（数据变更）

```ts
// app/(dashboard)/users/actions.ts
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"

const CreateUserSchema = z.object({ name: z.string().min(1), email: z.string().email() })

export async function createUser(formData: FormData) {
  const parsed = CreateUserSchema.safeParse({ name: formData.get("name"), email: formData.get("email") })
  if (!parsed.success) return { error: parsed.error.flatten() }

  await db.insert(usersTable).values(parsed.data)
  revalidatePath("/console/users") // 刷新页面缓存
  return { success: true }
}
```

---

## 3. URL searchParams 驱动的分页/筛选

**不要用 useState + fetch 做分页**，URL 是 Next.js 里状态的最佳载体：

```tsx
// 分页使用 <Link> 而不是 onClick setState
<Link href={`?page=${page + 1}&q=${keyword}`}>下一页</Link>
```

---

## 规则

1. **禁止在客户端组件中写数据库查询逻辑**，数据查询只在 Server Component 或 Server Action 中
2. **revalidatePath / revalidateTag 必须紧跟变更操作**，不能靠前端刷新
3. **所有外部输入必须 zod 校验**，在最入口处（Server Action 或 Route Handler 顶部）拦截
4. **函数命名**：查询用 `getXxx`，变更用 `createXxx` / `updateXxx` / `deleteXxx`，不需要 `fetchXxxApi` 这类前缀
