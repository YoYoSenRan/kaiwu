import { NextResponse } from "next/server"
import { readWorkspaceFile, writeWorkspaceFile } from "@kaiwu/openclaw"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; filename: string }> }): Promise<NextResponse> {
  const { id, filename } = await params
  const decoded = decodeURIComponent(filename)

  try {
    const content = await readWorkspaceFile(id, decoded)
    return NextResponse.json({ content: content ?? "" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "读取文件失败"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; filename: string }> }): Promise<NextResponse> {
  const { id, filename } = await params
  const decoded = decodeURIComponent(filename)

  const body = await req.json()
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content 必须是字符串" }, { status: 400 })
  }

  try {
    await writeWorkspaceFile(id, decoded, body.content)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "写入文件失败"
    const status = (err as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
