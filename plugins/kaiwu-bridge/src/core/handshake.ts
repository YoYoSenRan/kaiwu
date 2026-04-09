import { join } from "node:path"
import { readFileSync } from "node:fs"
import type { PluginLogger } from "../../api.js"

/** handshake 文件名。固定在插件自己的 rootDir 下，由 kaiwu 写入。 */
export const HANDSHAKE_FILENAME = ".kaiwu-handshake.json"

/** handshake 内容：kaiwu 启动 bridge server 后写出，插件启动时读取。 */
export interface KaiwuHandshake {
  port: number
  token: string
  /** kaiwu 主进程 pid。用于诊断。 */
  pid?: number
  /** 写入时间戳（ms）。插件用于检测过期。 */
  startedAt: number
}

export interface BridgeConfig {
  /** 连接 kaiwu bridge 的端口（127.0.0.1）。 */
  port: number
  /** 鉴权 token。 */
  token: string
  /** 日志级别。 */
  logLevel: "debug" | "info" | "warn" | "error"
}

/**
 * 解析插件运行时配置。
 * 优先级：pluginConfig（用户在 OpenClaw 配置里显式写的）→ handshake 文件 → 未配置时返回 null。
 * @param rootDir 插件安装目录
 * @param pluginConfig OpenClaw 注入的 pluginConfig 块
 * @param logger 日志
 */
export function resolveBridgeConfig(params: { rootDir: string | undefined; pluginConfig: Record<string, unknown> | undefined; logger: PluginLogger }): BridgeConfig | null {
  const { rootDir, pluginConfig, logger } = params
  const logLevel = readLogLevel(pluginConfig)

  const explicit = readExplicitConfig(pluginConfig)
  if (explicit) {
    return { ...explicit, logLevel }
  }

  if (!rootDir) {
    logger.warn?.("[kaiwu-bridge] no rootDir available, cannot locate handshake file")
    return null
  }

  const handshake = readHandshake(rootDir, logger)
  if (!handshake) {
    return null
  }
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
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level
  }
  return "info"
}

function readHandshake(rootDir: string, logger: PluginLogger): KaiwuHandshake | null {
  const handshakePath = join(rootDir, HANDSHAKE_FILENAME)
  try {
    const raw = readFileSync(handshakePath, "utf-8")
    const parsed: unknown = JSON.parse(raw)
    if (!isHandshake(parsed)) {
      logger.warn?.(`[kaiwu-bridge] handshake file malformed: ${handshakePath}`)
      return null
    }
    return parsed
  } catch (err) {
    // 文件不存在是常态（kaiwu 尚未启动），不算错误
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn?.(`[kaiwu-bridge] failed to read handshake: ${(err as Error).message}`)
    }
    return null
  }
}

function isHandshake(value: unknown): value is KaiwuHandshake {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.port === "number" && typeof v.token === "string" && typeof v.startedAt === "number"
}
