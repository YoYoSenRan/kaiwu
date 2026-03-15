# Route Handler 模板

## ⚠️ 先问：是否真的需要 Route Handler？

Next.js 全栈项目中，**大多数场景不需要 Route Handler**：

| 场景                            | 应该用什么                          |
| ------------------------------- | ----------------------------------- |
| 页面加载时获取数据              | Server Component 直接查 db          |
| 表单提交 / 增删改               | Server Action                       |
| 分页 / 筛选                     | URL searchParams + Server Component |
| **以下才需要 Route Handler**    | ↓                                   |
| 外部系统 Webhook 回调           | Route Handler                       |
| 文件上传（multipart/form-data） | Route Handler                       |
| 流式响应（SSE、Stream）         | Route Handler                       |
| 客户端需要轮询的实时数据        | Route Handler                       |

---

## Webhook 接收模板

```ts
// app/api/webhooks/[provider]/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params

  // 1. 验签（每个 provider 的方式不同）
  const signature = req.headers.get("x-signature")
  if (!verifySignature(signature, await req.text())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // 2. 处理事件
  const body = await req.json()
  await handleWebhookEvent(provider, body)

  return NextResponse.json({ received: true })
}
```

## 文件上传模板

```ts
// app/api/upload/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "未选择文件" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "文件超过 10MB 限制" }, { status: 400 })
  }

  // 上传到 OSS 等存储服务
  const url = await uploadToStorage(file)

  return NextResponse.json({ url })
}
```

## 规则

- Route Handler 中同样必须做输入校验（文件类型、大小、签名等）
- **禁止**用 Route Handler 替代 Server Action 做普通的增删改操作
- Route Handler 文件统一放 `app/api/` 下
