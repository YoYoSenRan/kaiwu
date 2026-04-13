import os from "node:os"
import { app } from "electron"

/** 是否为开发环境（未打包） */
export const isDev = !app.isPackaged

/** 是否为 macOS 平台 */
export const isMac = process.platform === "darwin"

/** 是否为 Windows 平台 */
export const isWin = process.platform === "win32"

/** 是否为 x64 架构 */
export const isX64 = process.arch === "x64"

/** 是否为 ARM64 架构（Apple Silicon / ARM Windows） */
export const isArm64 = process.arch === "arm64"

/** 是否为 Windows 7（NT 6.1，含 Windows Server 2008 R2）。 */
export const isWin7 = isWin && os.release().startsWith("6.1")

/** 是否为 Linux 平台 */
export const isLinux = process.platform === "linux"

/** 当前运行平台字符串，如 darwin / win32 / linux */
export const platform = process.platform
