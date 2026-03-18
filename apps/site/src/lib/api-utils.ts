import { type NextRequest, NextResponse } from "next/server"
import type { ZodSchema } from "zod"

/** 标准错误响应 */
export function apiError(message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status })
}

/**
 * Route Handler 包装器：Zod 校验 + 错误处理 + JSON 响应
 *
 * 用于 POST 接口，自动解析 body 并用 schema 校验。
 */
export async function apiHandler<TBody>(
  req: NextRequest,
  options: { schema: ZodSchema<TBody>; handler: (body: TBody, req: NextRequest) => Promise<NextResponse> }
): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json()
    const parsed = options.schema.safeParse(raw)

    if (!parsed.success) {
      return apiError("请求体校验失败", 400, parsed.error.flatten())
    }

    return await options.handler(parsed.data, req)
  } catch (err) {
    if (err instanceof SyntaxError) {
      return apiError("请求体不是合法 JSON", 400)
    }
    console.error("[api]", err)
    return apiError("服务器内部错误", 500)
  }
}
