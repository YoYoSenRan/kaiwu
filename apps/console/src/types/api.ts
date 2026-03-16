/**
 * 统一 API 响应格式
 */
export interface ApiResponse<TData = unknown> {
  /** 是否成功 */
  ok: boolean
  /** 响应数据 */
  data: TData | null
  /** 业务状态码，0 表示成功 */
  code: number
  /** 提示信息 */
  message: string
}

/**
 * 常用业务错误码
 */
export const ErrorCode = { SUCCESS: 0, BAD_REQUEST: 400, UNAUTHORIZED: 401, NOT_FOUND: 404, INTERNAL: 500, OPENCLAW_ERROR: 1001, DB_ERROR: 1002, SYNC_ERROR: 1003 } as const
