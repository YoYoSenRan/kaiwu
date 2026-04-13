import type { LaunchedApp } from "../../helpers/launch"

import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { launchApp, SHOULD_SKIP } from "../../helpers/launch"

// 覆盖 openclaw.check() 的 shape 与必填字段。

if (SHOULD_SKIP) {
  test.skip("linux: e2e 在 CI 环境不跑", () => {})
} else {
  let ctx: LaunchedApp

  beforeAll(async () => {
    ctx = await launchApp()
  })

  afterAll(async () => {
    // beforeAll 可能抛错导致 ctx 未赋值，用可选链避免掩盖真实的 launch 错误
    await ctx?.app?.close()
  })

  describe("openclaw compat", () => {
    test("openclaw: check() 返回 pluginApiRange 与 knownBreaking", async () => {
      const compat = await ctx.page.evaluate(() => window.electron.openclaw.check())
      expect(typeof compat.compatible).toBe("boolean")
      expect(typeof compat.pluginApiRange).toBe("string")
      expect(compat.pluginApiRange.length).toBeGreaterThan(0)
      expect(Array.isArray(compat.knownBreaking)).toBe(true)
    })
  })
}
