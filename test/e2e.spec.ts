import path from "node:path"
import { _electron as electron, type ElectronApplication, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vitest"

const root = path.join(__dirname, "..")

if (process.platform === "linux") {
  // Electron e2e 在 Linux CI 环境依赖过多（xvfb / libgbm 等），统一跳过
  test.skip("linux: e2e 在 CI 环境不跑", () => {})
} else {
  let app: ElectronApplication
  let page: Page

  beforeAll(async () => {
    app = await electron.launch({
      args: [".", "--no-sandbox"],
      cwd: root,
      env: { ...process.env, NODE_ENV: "development" },
    })
    page = await app.firstWindow()
    // 等 React 挂载完成，避免对未渲染 DOM 做断言
    await page.waitForSelector("#root > *", { state: "attached" })
  })

  afterAll(async () => {
    await app.close()
  })

  describe("startup", () => {
    test("startup: 主窗口成功创建", async () => {
      const count = await app.windows().length
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test("startup: React 应用已挂载到 #root", async () => {
      const childCount = await page.locator("#root > *").count()
      expect(childCount).toBeGreaterThan(0)
    })

    test("startup: 默认落在根路由（HashRouter #/）", async () => {
      const hash = await page.evaluate(() => window.location.hash)
      expect(hash === "" || hash === "#/" || hash === "#").toBe(true)
    })
  })

  describe("bridge", () => {
    test("bridge: window.electron 已由 contextBridge 暴露", async () => {
      const type = await page.evaluate(() => typeof (window as unknown as { electron?: unknown }).electron)
      expect(type).toBe("object")
    })

    test("bridge: 四个 feature 域齐全（log / chrome / updater / deeplink）", async () => {
      const keys = await page.evaluate(() =>
        Object.keys((window as unknown as { electron: Record<string, unknown> }).electron),
      )
      expect(keys.sort()).toEqual(["chrome", "deeplink", "log", "updater"])
    })

    test("bridge: chrome 暴露最小化/最大化/关闭方法", async () => {
      const methods = await page.evaluate(() =>
        Object.keys((window as unknown as { electron: { chrome: Record<string, unknown> } }).electron.chrome),
      )
      expect(methods).toEqual(expect.arrayContaining(["minimize", "maximize", "close"]))
    })
  })

  describe("demo", () => {
    test("demo: 首页渲染出 MERIDIAN 品牌标识", async () => {
      const hit = await page.locator("text=MERIDIAN").count()
      expect(hit).toBeGreaterThan(0)
    })
  })
}
