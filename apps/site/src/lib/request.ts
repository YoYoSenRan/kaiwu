/**
 * HTTP 请求封装
 * 在此基础上添加鉴权、错误处理等通用逻辑
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { "Content-Type": "application/json", ...init?.headers }, ...init })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
