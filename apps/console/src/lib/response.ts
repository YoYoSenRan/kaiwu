import { NextResponse } from "next/server"
import { ErrorCode } from "@/types/api"
import type { ApiResponse } from "@/types/api"

/**
 * 成功响应
 */
export function ok<TData>(data: TData, message = "success"): NextResponse<ApiResponse<TData>> {
  return NextResponse.json({ ok: true, data, code: ErrorCode.SUCCESS, message })
}

/**
 * 失败响应
 */
export function fail(code: number, message: string, httpStatus = 200): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ ok: false, data: null, code, message }, { status: httpStatus })
}
