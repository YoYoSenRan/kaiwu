"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { loadCredentials } from "@/lib/gateway/credentials"
import { useGateway } from "@/hooks/useGateway"

/**
 * Gateway 连接守卫
 * 检查是否有缓存凭据，无则跳转 /setup；有则自动连接
 * 连接失败也跳转 /setup 重新认证
 */
export function GatewayGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status, error } = useGateway()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const creds = loadCredentials()
    if (!creds) {
      router.replace("/setup")
      return
    }
    setChecked(true)
  }, [router])

  // 连接失败且是认证类错误，跳转重新认证
  useEffect(() => {
    if (!checked) return
    if (status === "disconnected" && error) {
      const authErrors = ["AUTH_TOKEN_MISMATCH", "AUTH_TOKEN_MISSING", "ORIGIN_NOT_ALLOWED"]
      if (authErrors.some((code) => error.includes(code))) {
        router.replace("/setup")
      }
    }
  }, [status, error, checked, router])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
