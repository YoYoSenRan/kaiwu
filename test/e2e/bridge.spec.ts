import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { launchApp, SHOULD_SKIP, type LaunchedApp } from "../helpers/launch"

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

  describe("bridge", () => {
    test("bridge: window.electron 已由 contextBridge 暴露", async () => {
      const type = await ctx.page.evaluate(() => typeof (window as unknown as { electron?: unknown }).electron)
      expect(type).toBe("object")
    })

    test("bridge: 五个 feature 域齐全（log / chrome / updater / deeplink / openclaw）", async () => {
      const keys = await ctx.page.evaluate(() => Object.keys((window as unknown as { electron: Record<string, unknown> }).electron))
      expect(keys.sort()).toEqual(["chrome", "deeplink", "log", "openclaw", "updater"])
    })

    test("bridge: chrome 暴露最小化/最大化/关闭方法", async () => {
      const methods = await ctx.page.evaluate(() => Object.keys((window as unknown as { electron: { chrome: Record<string, unknown> } }).electron.chrome))
      expect(methods).toEqual(expect.arrayContaining(["minimize", "maximize", "close"]))
    })
  })
}
