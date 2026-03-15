# 表单模板（创建 / 编辑双模式）

## 使用场景

数据录入页面，支持"新建"和"编辑"两种模式共用同一套表单组件。

## 标准结构

```
src/app/(dashboard)/[feature]/
├── create/
│   └── page.tsx         ← 新建页，传 undefined 给 XxxForm
├── [id]/edit/
│   ├── page.tsx          ← 编辑页，查询数据后传给 XxxForm
│   └── queries.ts
├── actions.ts            ← createXxxAction / updateXxxAction
└── components/
    └── XxxForm.tsx       ← 双模式共用表单
```

## actions.ts 模板

```ts
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"

export const XxxSchema = z.object({ name: z.string().min(1, "名称不能为空"), description: z.string().optional() })

export type XxxFormData = z.infer<typeof XxxSchema>

export async function createXxxAction(data: XxxFormData) {
  const parsed = XxxSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  await db.insert(xxxTable).values(parsed.data)
  revalidatePath("/console/xxx")
  return { success: true }
}

export async function updateXxxAction(id: number, data: XxxFormData) {
  const parsed = XxxSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  await db.update(xxxTable).set(parsed.data).where(eq(xxxTable.id, id))
  revalidatePath("/console/xxx")
  return { success: true }
}
```

## XxxForm.tsx 模板

```tsx
'use client'

// 双模式：传入 defaultValues 则为编辑模式，否则为新建模式
interface XxxFormProps {
  defaultValues?: XxxFormData
  id?: number
}

export function XxxForm({ defaultValues, id }: XxxFormProps) {
  const isEdit = id !== undefined
  const router = useRouter()

  async function onSubmit(data: XxxFormData) {
    const result = isEdit
      ? await updateXxxAction(id, data)
      : await createXxxAction(data)

    if (result.error) {
      // 显示错误
      return
    }
    router.push('/console/xxx')
  }

  return (
    <form onSubmit={...}>
      {/* 表单字段 */}
      <button type="submit">{isEdit ? '保存修改' : '创建'}</button>
    </form>
  )
}
```
