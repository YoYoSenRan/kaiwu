import type { LaunchedApp } from "../../helpers/launch"

import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { launchApp, SHOULD_SKIP } from "../../helpers/launch"

// 覆盖 openclaw.detect() 的 shape 合同与性能预算。
// 只做只读侦测，不触发任何副作用，任何机器（有无 OpenClaw）都能跑。

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

  describe("openclaw detect", () => {
    test("openclaw: detect() 返回值 shape 正确", async () => {
      const status = await ctx.page.evaluate(() => window.electron.openclaw.detect())
      // 关键字段都必须存在（即使机器没装 OpenClaw，也应返回结构化默认值）
      expect(typeof status.installed).toBe("boolean")
      expect(typeof status.running).toBe("boolean")
      expect(typeof status.bridgeInstalled).toBe("boolean")
      expect(status.configDir === null || typeof status.configDir === "string").toBe(true)
    })

    test("openclaw: detect() 不抛错且在合理时间内完成", async () => {
      // 上限 5s：含 500ms 端口探测 + 3s CLI 探测 + fs 读取，正常路径 < 1s
      const started = Date.now()
      await ctx.page.evaluate(() => window.electron.openclaw.detect())
      expect(Date.now() - started).toBeLessThan(5000)
    })
  })
}
