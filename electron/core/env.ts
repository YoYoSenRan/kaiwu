import os from "node:os"
import { app } from "electron"

/** 是否为开发环境（未打包） */
export const isDev = !app.isPackaged

/** 是否为 macOS 平台 */
export const isMac = process.platform === "darwin"

/** 是否为 Windows 平台 */
export const isWin = process.platform === "win32"

/** 是否为 Linux 平台 */
export const isLinux = process.platform === "linux"

/** 是否为 Windows 7（通过 NT 内核版本号 6.1 判断） */
export const isWin7 = isWin && os.release().startsWith("6.1")
