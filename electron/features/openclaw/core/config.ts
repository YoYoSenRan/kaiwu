import { promises as fs } from "node:fs"
import { join } from "node:path"

/** OpenClaw gateway 认证凭据。 */
export interface GatewayAuth {
  mode: string | null
  token: string | null
  password: string | null
}

/**
 * 解析 secret 值，支持直接字符串或 `{ env: "VAR_NAME" }` 环境变量引用。
 * @param value 原始配置值
 */
function resolveSecretInput(value: string | { env?: string } | null | undefined): string | null {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null) {
    const envRef = (value as { env?: string }).env
    if (envRef) return process.env[envRef] ?? null
  }
  return null
}

/**
 * 从 OpenClaw 配置文件读取 gateway 认证凭据。
 * 路径：`<configDir>/openclaw.json` → `gateway.auth`。
 * @param configDir OpenClaw 配置根目录，null 时返回空凭据
 */
export async function readGatewayAuth(configDir: string | null): Promise<GatewayAuth> {
  if (!configDir) return { mode: null, token: null, password: null }
  const configPath = join(configDir, "openclaw.json")
  try {
    const raw = await fs.readFile(configPath, "utf-8")
    const config = JSON.parse(raw) as {
      gateway?: {
        auth?: {
          mode?: string
          token?: string | { env?: string }
          password?: string | { env?: string }
        }
      }
    }
    const auth = config.gateway?.auth
    return {
      mode: auth?.mode ?? null,
      token: resolveSecretInput(auth?.token),
      password: resolveSecretInput(auth?.password),
    }
  } catch {
    return { mode: null, token: null, password: null }
  }
}
