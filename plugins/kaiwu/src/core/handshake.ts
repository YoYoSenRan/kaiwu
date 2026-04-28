import type { PluginLogger } from "../../api.js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/** handshake 文件名。固定在插件自己的 rootDir 下,由控制端写入。 */
export const HANDSHAKE_FILENAME = ".kaiwu-handshake.json"

/** handshake 内容:控制端启动 bridge server 后写出,插件启动时读取。 */
export interface KaiwuHandshake {
  port: number
  token: string
  /** 控制端主进程 pid。用于诊断。 */
  pid?: number
  /** 写入时间戳(ms)。插件用于检测过期。 */
  startedAt: number
}

export interface BridgeConfig {
  port: number
  token: string
  logLevel: "debug" | "info" | "warn" | "error"
}

/**
 * 解析插件运行时配置。
 * 优先级:pluginConfig(用户在宿主配置里显式写的)→ handshake 文件 → 未配置时返回 null。
 */
export function resolveBridgeConfig(params: { rootDir: string | undefined; pluginConfig: Record<string, unknown> | undefined; logger: PluginLogger }): BridgeConfig | null {
  const { rootDir, pluginConfig, logger } = params
  const logLevel = readLogLevel(pluginConfig)

  const explicit = readExplicitConfig(pluginConfig)
  if (explicit) return { ...explicit, logLevel }

  if (!rootDir) {
    logger.warn?.("[kaiwu] no rootDir available, cannot locate handshake file")
    return null
  }

  const handshake = readHandshake(rootDir, logger)
  if (!handshake) return null
  return { port: handshake.port, token: handshake.token, logLevel }
}

function readExplicitConfig(pluginConfig: Record<string, unknown> | undefined): { port: number; token: string } | null {
  const port = pluginConfig?.bridgePort
  const token = pluginConfig?.token
  if (typeof port === "number" && typeof token === "string" && token.length > 0) {
    return { port, token }
  }
  return null
}

function readLogLevel(pluginConfig: Record<string, unknown> | undefined): BridgeConfig["logLevel"] {
  const level = pluginConfig?.logLevel
  if (level === "debug" || level === "info" || level === "warn" || level === "error") return level
  return "info"
}

function readHandshake(rootDir: string, logger: PluginLogger): KaiwuHandshake | null {
  const handshakePath = join(rootDir, HANDSHAKE_FILENAME)
  try {
    const raw = readFileSync(handshakePath, "utf-8")
    const parsed: unknown = JSON.parse(raw)
    if (!isHandshake(parsed)) {
      logger.warn?.(`[kaiwu] handshake file malformed: ${handshakePath}`)
      return null
    }
    return parsed
  } catch (err) {
    // ENOENT 是常态(控制端尚未启动)不上报;其他错误(权限/损坏)才 warn
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn?.(`[kaiwu] failed to read handshake: ${(err as Error).message}`)
    }
    return null
  }
}

function isHandshake(value: unknown): value is KaiwuHandshake {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.port === "number" && typeof v.token === "string" && typeof v.startedAt === "number"
}
