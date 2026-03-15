/**
 * 控制台 HTTP 请求封装
 * 包括默认的 token 拦截、通用错误处理等
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

interface FetchOptions extends RequestInit {
  // 可以在这里扩展自定义选项，例如是否显示全局 loading
  skipErrorHandler?: boolean
}

export async function request<T>(path: string, options?: FetchOptions): Promise<T> {
  const { skipErrorHandler, ...init } = options ?? {}

  // 这里可以从状态库或 cookie 获取 token
  // const token = useAuthStore.getState().token;
  const token = ""

  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json")

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  // 1. HTTP 状态码错误
  if (!res.ok) {
    if (!skipErrorHandler) {
      if (res.status === 401) {
        // TODO: 处理登出或跳转登录页逻辑
        console.error("认证失败，请重新登录")
      } else {
        // TODO: 全局 toast 提示
        console.error(`HTTP 错误: ${res.status}`)
      }
    }
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const data = await res.json()

  // 2. 业务状态码错误 (假设后端返回结构包含 code 字段)
  // if (data.code !== 200) {
  //   throw new Error(data.message || 'Business Error');
  // }

  return data as T
}
