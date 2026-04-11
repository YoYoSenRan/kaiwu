import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { isWin } from "./env"

// 编译后位于 dist-electron/main/main.js，向上两级即项目根
// dist-electron/main → dist-electron → 项目根
const currentDir = path.dirname(fileURLToPath(import.meta.url))

/** `.openclaw` 目录名常量，跨平台共用。 */
const OPENCLAW_DIRNAME = ".openclaw"

/** 项目根目录（包含 dist-electron 和 dist 的父目录） */
export const APP_ROOT = path.join(currentDir, "../..")

/** Electron 主进程/预加载打包输出目录 */
export const MAIN_DIST = path.join(APP_ROOT, "dist-electron")

/** 渲染进程打包输出目录 */
export const RENDERER_DIST = path.join(APP_ROOT, "dist")

/** Vite 开发服务器地址，仅 dev 模式存在 */
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

/** 静态资源目录：dev 时指向 public，build 时指向 dist */
export const VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(APP_ROOT, "public") : RENDERER_DIST

/** 预加载脚本路径 */
export const PRELOAD_PATH = path.join(MAIN_DIST, "preload/preload.mjs")

/** 渲染进程首页入口 */
export const INDEX_HTML = path.join(RENDERER_DIST, "index.html")

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
