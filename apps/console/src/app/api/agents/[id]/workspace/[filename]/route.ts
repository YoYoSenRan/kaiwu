import { NextResponse } from "next/server"
import { readWorkspaceFile, writeWorkspaceFile } from "@kaiwu/openclaw"
import { ok, fail } from "@/lib/response"
import { ErrorCode } from "@/types/api"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; filename: string }> }): Promise<NextResponse> {
  const { id, filename } = await params
  const decoded = decodeURIComponent(filename)

  try {
    const content = await readWorkspaceFile(id, decoded)
    return ok({ content: content ?? "" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "读取文件失败"
    return fail(ErrorCode.OPENCLAW_ERROR, message, 400)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; filename: string }> }): Promise<NextResponse> {
  const { id, filename } = await params
  const decoded = decodeURIComponent(filename)

  const body = await req.json()
  if (typeof body.content !== "string") {
    return fail(ErrorCode.BAD_REQUEST, "content 必须是字符串", 400)
  }

  try {
    await writeWorkspaceFile(id, decoded, body.content)
    return ok(null, "保存成功")
  } catch (err) {
    const message = err instanceof Error ? err.message : "写入文件失败"
    const httpStatus = (err as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500
    return fail(ErrorCode.OPENCLAW_ERROR, message, httpStatus)
  }
}
