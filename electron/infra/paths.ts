import path from "node:path"

// Electron 41 捆绑 Node 22，支持 import.meta.dirname
const currentDir = import.meta.dirname

/** 项目根目录（包含 dist-electron 和 dist 的父目录） */
export const appRoot = path.join(currentDir, "../..")

/** Electron 主进程/预加载打包输出目录 */
export const mainDist = path.join(appRoot, "dist-electron")

/** 渲染进程打包输出目录 */
export const rendererDist = path.join(appRoot, "dist")

/** 渲染进程首页入口 */
export const indexHtml = path.join(rendererDist, "index.html")

/** 预加载脚本路径 */
export const preloadPath = path.join(mainDist, "preload/preload.mjs")

/** 静态资源目录：dev 时指向 public，build 时指向 dist */
export const publicPath = process.env.VITE_DEV_SERVER_URL?.trim() ? path.join(appRoot, "public") : rendererDist

/** Vite 开发服务器地址，仅 dev 模式存在 */
export const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL
