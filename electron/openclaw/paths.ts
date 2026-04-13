import os from "node:os"
import path from "node:path"
import { isWin } from "../core/env"

const OPENCLAW_DIRNAME = ".openclaw"

/**
 * 解析 OpenClaw 配置根目录。
 * 优先读 OPENCLAW_HOME 覆盖，否则跨平台 fallback：
 * - Windows: %APPDATA%\.openclaw
 * - 其他:    $HOME/.openclaw
 */
export function getOpenclawRoot(): string {
  const override = process.env.OPENCLAW_HOME
  if (override && override.length > 0) return override
  if (isWin) {
    const appData = process.env.APPDATA
    if (appData) return path.join(appData, OPENCLAW_DIRNAME)
    return path.join(os.homedir(), "AppData", "Roaming", OPENCLAW_DIRNAME)
  }
  return path.join(os.homedir(), OPENCLAW_DIRNAME)
}

/**
 * 按 kaiwu 约定拼出 agent workspace 目录：`<openclawRoot>/workspace-<agent>`。
 * @param agent openclaw 侧的 agent id（`[a-z0-9_-]`，由调用方保证合法）
 */
export function resolveWorkspacePath(agent: string): string {
  return path.join(getOpenclawRoot(), `workspace-${agent}`)
}
