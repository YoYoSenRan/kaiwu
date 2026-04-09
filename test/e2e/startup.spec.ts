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

  describe("startup", () => {
    test("startup: 主窗口成功创建", async () => {
      const count = await ctx.app.windows().length
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test("startup: React 应用已挂载到 #root", async () => {
      const childCount = await ctx.page.locator("#root > *").count()
      expect(childCount).toBeGreaterThan(0)
    })

    test("startup: 默认落在根路由（HashRouter #/）", async () => {
      const hash = await ctx.page.evaluate(() => window.location.hash)
      expect(hash === "" || hash === "#/" || hash === "#").toBe(true)
    })
  })
}
