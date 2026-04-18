/**
 * OpenClaw 配置目录解析 —— 发现层的路径决策。
 *
 * bridge 插件文件路径(基于 extensionsDir)在 bridge/paths.ts。
 */

import fsSync from "node:fs"
import os from "node:os"
import path from "node:path"
import { isWin } from "../../../infra/env"

/** OpenClaw 配置目录名。Windows 下位于 `%APPDATA%`,其他平台位于 `$HOME`。 */
const OPENCLAW_DIRNAME = ".openclaw"
/** OpenClaw 旧版配置目录名(rebrand 前)。 */
const LEGACY_DIRNAME = ".clawdbot"

/**
 * 解析 OpenClaw 配置根目录。优先级:
 * 1. `OPENCLAW_STATE_DIR` 环境变量
 * 2. `OPENCLAW_HOME` 环境变量
 * 3. 当前默认路径(存在即用)
 * 4. legacy 路径(存在即用,兼容 rebrand 前)
 * 5. 默认路径(不存在也返回,由调用方决定如何处理)
 */
export function configDir(): string {
  const stateDir = process.env.OPENCLAW_STATE_DIR?.trim()
  if (stateDir) return stateDir
  const home = process.env.OPENCLAW_HOME?.trim()
  if (home) return home

  const base = defaultBase(OPENCLAW_DIRNAME)
  if (fsSync.existsSync(base)) return base
  const legacy = defaultBase(LEGACY_DIRNAME)
  if (fsSync.existsSync(legacy)) return legacy
  return base
}

/** 返回 OpenClaw 根目录(仅用于 agent workspace 解析,不判断 legacy)。 */
export function openclawRoot(): string {
  const override = process.env.OPENCLAW_HOME
  if (override && override.length > 0) return override
  return defaultBase(OPENCLAW_DIRNAME)
}

/** 按 kaiwu 约定拼出 agent workspace 目录:`<openclawRoot>/workspace-<agent>`。 */
export function workspacePath(agent: string): string {
  return path.join(openclawRoot(), `workspace-${agent}`)
}

function defaultBase(name: string): string {
  if (isWin) {
    const appData = process.env.APPDATA
    return appData ? path.join(appData, name) : path.join(os.homedir(), "AppData", "Roaming", name)
  }
  return path.join(os.homedir(), name)
}
