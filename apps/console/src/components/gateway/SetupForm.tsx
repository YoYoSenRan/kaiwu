"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Radio } from "lucide-react"
import { useGateway } from "@/hooks/useGateway"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const DEFAULT_GATEWAY_URL = "ws://127.0.0.1:18789"

type AuthMode = "token" | "password"

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_TOKEN_MISMATCH: "Token 不正确，请检查后重试",
  AUTH_TOKEN_MISSING: "未提供认证凭据",
  AUTH_PASSWORD_MISMATCH: "密码不正确，请检查后重试",
  AUTH_PASSWORD_MISSING: "未提供密码",
  AUTH_RATE_LIMITED: "认证请求过于频繁，请稍后再试",
  ORIGIN_NOT_ALLOWED: "当前域名未授权，请在 Gateway 配置中添加",
}

function formatError(error: string | null): string {
  if (!error) return ""
  if (error in ERROR_MESSAGES) return ERROR_MESSAGES[error]
  if (error.includes("timeout") || error.includes("ECONNREFUSED")) {
    return "无法连接到 Gateway，请检查地址是否正确"
  }
  return error
}

interface SetupFormProps {
  onSuccess: () => void
}

export function SetupForm({ onSuccess }: SetupFormProps) {
  const { status, error, connect } = useGateway()
  const [url, setUrl] = useState(DEFAULT_GATEWAY_URL)
  const [authMode, setAuthMode] = useState<AuthMode>("token")
  const [credential, setCredential] = useState("")

  const isConnecting = status === "connecting"

  useEffect(() => {
    if (status === "connected") {
      onSuccess()
    }
  }, [status, onSuccess])

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    connect(url.trim(), credential.trim())
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Radio className="size-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">连接 OpenClaw Gateway</CardTitle>
        <CardDescription>输入 Gateway 地址和认证凭据以建立连接</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gateway-url">Gateway 地址</Label>
            <Input id="gateway-url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ws://host:port" disabled={isConnecting} required />
          </div>

          <div className="space-y-2">
            <Label>认证方式</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={authMode === "token" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setAuthMode("token")}
                disabled={isConnecting}
              >
                Token
              </Button>
              <Button
                type="button"
                variant={authMode === "password" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setAuthMode("password")}
                disabled={isConnecting}
              >
                密码
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gateway-credential">{authMode === "token" ? "Token" : "密码"}</Label>
            <Input
              id="gateway-credential"
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder={authMode === "token" ? "输入 Gateway Token" : "输入 Gateway 密码"}
              disabled={isConnecting}
              required
            />
          </div>

          {error && (status === "disconnected" || status === "reconnecting") && (
            <div role="alert" className={cn("rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive")}>
              {formatError(error)}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isConnecting}>
            {isConnecting ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                连接中...
              </>
            ) : (
              "连接"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">首次使用需连接本地或远程 OpenClaw Gateway 实例</p>
      </CardContent>
    </Card>
  )
}
