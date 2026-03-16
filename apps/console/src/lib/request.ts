/**
 * 控制台 HTTP 请求封装
 * 统一解析 { ok, data, code, message } 格式
 * 开发环境自动在浏览器控制台输出请求/响应日志
 */

import { logger } from "./logger"
import type { ApiResponse } from "@/types/api"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

interface FetchOptions extends RequestInit {
  /** 跳过统一错误处理 */
  skipErrorHandler?: boolean
}

/**
 * 发起请求并解析统一响应格式
 * 成功时返回 data 字段，失败时抛出 Error（message 为接口返回的 message）
 */
export async function request<TData>(path: string, options?: FetchOptions): Promise<TData> {
  const { skipErrorHandler, ...init } = options ?? {}
  const method = (init.method ?? "GET").toUpperCase()
  const url = `${BASE_URL}${path}`

  const headers = new Headers(init.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  // 请求日志
  let body: unknown
  if (init.body && typeof init.body === "string") {
    try {
      body = JSON.parse(init.body)
    } catch {
      body = init.body
    }
  }
  logger.request(method, path, body)

  const start = performance.now()

  try {
    const res = await fetch(url, { ...init, headers })
    const durationMs = Math.round(performance.now() - start)
    const json: ApiResponse<TData> = await res.json()

    // 响应日志
    logger.response(method, path, res.status, json, durationMs)

    // HTTP 层错误
    if (!res.ok) {
      if (!skipErrorHandler && res.status === 401) {
        logger.error(method, path, "认证失败，请重新登录")
      }
      throw new Error(json.message ?? `HTTP ${res.status}`)
    }

    // 业务层错误
    if (!json.ok) {
      throw new Error(json.message ?? "请求失败")
    }

    return json.data as TData
  } catch (err) {
    if (!(err instanceof Error && err.message.startsWith("HTTP "))) {
      logger.error(method, path, err)
    }
    throw err
  }
}
