import fsSync from "node:fs"
import path from "node:path"

const DEFAULT_GATEWAY_PORT = 18789

function parseGatewayPortEnvValue(raw: string): number | null {
  if (/^\d+$/.test(raw)) {
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const m = raw.match(/^\[?[^:\]]+\]?:(\d+)$/)
  if (m?.[1]) {
    const n = Number.parseInt(m[1], 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

/**
 * 解析 OpenClaw 实际监听端口。
 * 优先级：OPENCLAW_GATEWAY_PORT 环境变量 > openclaw.json 的 gateway.port > 默认 18789。
 */
export function resolveActualPort(configDir: string): number {
  const envRaw = process.env.OPENCLAW_GATEWAY_PORT?.trim()
  if (envRaw) {
    const parsed = parseGatewayPortEnvValue(envRaw)
    if (parsed) return parsed
  }
  if (configDir) {
    try {
      const raw = fsSync.readFileSync(path.join(configDir, "openclaw.json"), "utf-8")
      const cfg = JSON.parse(raw) as { gateway?: { port?: number } }
      if (typeof cfg.gateway?.port === "number" && cfg.gateway.port > 0) {
        return cfg.gateway.port
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_GATEWAY_PORT
}
