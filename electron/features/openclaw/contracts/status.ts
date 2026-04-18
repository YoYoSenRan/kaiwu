/**
 * OpenClaw 整体状态聚合契约。
 *
 * 由 `status.ts` 的 computeStatus 计算 = discovery (ScanResult) + bridge (安装状态)。
 */

import type { ScanResult } from "./install"

/** OpenClaw 当前状态:gateway 扫描结果 + kaiwu 插件安装状态。 */
export interface OpenClawStatus extends ScanResult {
  /** 插件是否已同步到 extensionsDir。 */
  bridgeInstalled: boolean
  /** 已安装插件的版本(读目标路径 package.json)。 */
  installedBridgeVersion: string | null
}

/** 兼容性检查结果。 */
export interface CompatibilityResult {
  compatible: boolean
  /** host 版本。 */
  hostVersion: string | null
  /** 插件声明的 pluginApi 范围。 */
  pluginApiRange: string
  /** 不兼容时的人类可读原因。 */
  reason?: string
  /** 已知会影响第三方插件的 breaking change 列表。 */
  knownBreaking: { version: string; change: string }[]
}
