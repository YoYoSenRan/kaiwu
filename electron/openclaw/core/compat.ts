import type { CompatResult } from "../types"

import { promises as fs } from "node:fs"
import path from "node:path"
import semver from "semver"
import { appRoot } from "../../core/paths"

/**
 * kaiwu 插件兼容的最低 OpenClaw 版本范围。
 * 每次 OpenClaw 发生插件 API breaking change 时，更新这里和
 * plugins/kaiwu/package.json 的 openclaw.compat.pluginApi。
 */
export const SUPPORTED_OPENCLAW_RANGE = ">=2026.3.1"

/**
 * 已知影响第三方插件的 breaking change 列表。
 * 用于给用户友好的错误提示，而不是只抛一句"版本不兼容"。
 */
export const KNOWN_BREAKING_CHANGES: { version: string; change: string }[] = [
  {
    version: "2026.3.1",
    change: "registerHttpHandler 被移除，插件必须改用 registerHttpRoute",
  },
]

/** 插件源码在 kaiwu 仓库中的目录。 */
export const PLUGIN_SOURCE_DIR = path.join(appRoot, "plugins", "kaiwu")

/**
 * 校验 host 版本是否满足 kaiwu 插件的兼容性要求。
 * @param hostVersion OpenClaw 当前版本，null 表示未探测到
 */
export function checkCompatibility(hostVersion: string | null): CompatResult {
  const base: CompatResult = {
    compatible: false,
    hostVersion,
    pluginApiRange: SUPPORTED_OPENCLAW_RANGE,
    knownBreaking: KNOWN_BREAKING_CHANGES,
  }

  if (!hostVersion) {
    return { ...base, reason: "未能探测到 OpenClaw 版本，请确认已安装并启动" }
  }

  const coerced = semver.coerce(hostVersion)
  if (!coerced) {
    return { ...base, reason: `无法解析 OpenClaw 版本号：${hostVersion}` }
  }

  if (!semver.satisfies(coerced, SUPPORTED_OPENCLAW_RANGE)) {
    return {
      ...base,
      reason: `OpenClaw ${hostVersion} 低于最低支持版本 ${SUPPORTED_OPENCLAW_RANGE}`,
    }
  }

  return { ...base, compatible: true }
}

/** 从插件源码的 package.json 读当前声明的 pluginApi range，用于 UI 展示对齐检查。 */
export async function readPluginDeclaredRange(): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(PLUGIN_SOURCE_DIR, "package.json"), "utf-8")
    const json = JSON.parse(raw) as {
      openclaw?: { compat?: { pluginApi?: string } }
    }
    return json.openclaw?.compat?.pluginApi ?? null
  } catch {
    return null
  }
}
