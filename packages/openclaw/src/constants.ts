import { homedir } from "node:os"
import { join } from "node:path"

/**
 * OpenClaw 根目录，优先读 OPENCLAW_DIR 环境变量，默认 ~/.openclaw
 */
export const OPENCLAW_DIR = process.env.OPENCLAW_DIR ?? join(homedir(), ".openclaw")
export const OPENCLAW_JSON_PATH = join(OPENCLAW_DIR, "openclaw.json")

/** Gateway 主机地址 */
export const OPENCLAW_GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST ?? "127.0.0.1"
/** Gateway 端口 */
export const OPENCLAW_GATEWAY_PORT = Number(process.env.OPENCLAW_GATEWAY_PORT ?? 18789)

/**
 * OpenClaw workspace 官方支持的 .md 文件
 */
export const ALLOWED_WORKSPACE_FILES = new Set(["SOUL.md", "IDENTITY.md", "AGENTS.md", "USER.md", "TOOLS.md", "WORKING.md", "MEMORY.md", "HEARTBEAT.md", "agent.md"])
