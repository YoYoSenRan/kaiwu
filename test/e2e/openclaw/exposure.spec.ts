import type { LaunchedApp } from "../../helpers/launch"

import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { launchApp, SHOULD_SKIP } from "../../helpers/launch"

// 覆盖 window.electron.openclaw 的接口契约：方法齐全 + 事件订阅取消函数。

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

  describe("openclaw exposure", () => {
    test("openclaw: bridge 暴露全部 13 个方法", async () => {
      const methods = await ctx.page.evaluate(() => Object.keys((window as unknown as { electron: { openclaw: Record<string, unknown> } }).electron.openclaw))
      expect(methods.sort()).toEqual(
        ["check", "connect", "detect", "disconnect", "install", "invoke", "onEvent", "onGatewayStatus", "onMonitor", "onStatus", "restart", "state", "uninstall"].sort(),
      )
    })

    test("openclaw: onEvent 订阅返回取消函数", async () => {
      const returnType = await ctx.page.evaluate(() => {
        const off = window.electron.openclaw.onEvent(() => {})
        const t = typeof off
        off()
        return t
      })
      expect(returnType).toBe("function")
    })
  })
}
