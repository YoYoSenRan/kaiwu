/**
 * kaiwu bridge 插件在 OpenClaw extensionsDir 下的文件路径。
 *
 * OpenClaw 配置根目录解析在 discovery/paths.ts。
 */

import path from "node:path"

/** bridge 插件在 extensions 下的子目录名。kaiwu/openclaw 两侧约定一致,不能改。 */
const BRIDGE_DIRNAME = "kaiwu"

/** handshake 文件名。kaiwu 与插件的 wire 契约(插件侧读此路径),不能改。 */
const HANDSHAKE_FILENAME = ".kaiwu-handshake.json"

/** bridge 插件目录:`<extensionsDir>/kaiwu`。 */
export function bridgeDir(extensionsDir: string): string {
  return path.join(extensionsDir, BRIDGE_DIRNAME)
}

/** handshake 文件路径:`<extensionsDir>/kaiwu/.kaiwu-handshake.json`。 */
export function connectFilePath(extensionsDir: string): string {
  return path.join(bridgeDir(extensionsDir), HANDSHAKE_FILENAME)
}

/** bridge 插件 package.json 路径,用于读已安装版本。 */
export function bridgePackageJson(extensionsDir: string): string {
  return path.join(bridgeDir(extensionsDir), "package.json")
}
