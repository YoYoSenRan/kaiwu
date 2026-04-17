import fsSync from "node:fs"
import os from "node:os"
import path from "node:path"
import { isWin } from "../../infra/env"

/** `.openclaw` 目录在 Windows 上位于 %APPDATA%,其他平台位于 $HOME。 */
const OPENCLAW_DIRNAME = ".openclaw"
/** OpenClaw 旧版 state 目录名(rebrand 前)。 */
const LEGACY_DIRNAME = ".clawdbot"
/** bridge 插件在 extensions 下的子目录名。kaiwu/openclaw 两侧约定一致,不能改。 */
const BRIDGE_DIRNAME = "kaiwu"
/** connect 文件名。这是 kaiwu 与插件的 wire 契约(插件侧读此路径),不能改。 */
const CONNECT_FILENAME = ".kaiwu-handshake.json"

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

/** bridge 插件目录:`<extensionsDir>/kaiwu`。 */
export function bridgeDir(extensionsDir: string): string {
  return path.join(extensionsDir, BRIDGE_DIRNAME)
}

/** connect 文件路径:`<extensionsDir>/kaiwu/.kaiwu-handshake.json`。 */
export function connectFilePath(extensionsDir: string): string {
  return path.join(bridgeDir(extensionsDir), CONNECT_FILENAME)
}

/** bridge 插件 package.json 路径,用于读已安装版本。 */
export function bridgePackageJson(extensionsDir: string): string {
  return path.join(bridgeDir(extensionsDir), "package.json")
}

function defaultBase(name: string): string {
  if (isWin) {
    const appData = process.env.APPDATA
    return appData ? path.join(appData, name) : path.join(os.homedir(), "AppData", "Roaming", name)
  }
  return path.join(os.homedir(), name)
}
