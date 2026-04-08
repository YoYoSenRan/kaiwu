import path from "node:path"
import { fileURLToPath } from "node:url"

// 编译后位于 dist-electron/main/main.js，向上两级即项目根
// dist-electron/main → dist-electron → 项目根
const currentDir = path.dirname(fileURLToPath(import.meta.url))

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
