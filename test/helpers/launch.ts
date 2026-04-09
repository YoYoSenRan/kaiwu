import path from "node:path"
import { _electron as electron, type ElectronApplication, type Page } from "playwright"

/** 项目根目录（helpers → test → repo-root）。 */
const REPO_ROOT = path.join(__dirname, "../..")

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
}

/**
 * 启动 kaiwu Electron 应用，返回已就绪的 app 和主窗口 page。
 * 已经等到 React 完成首帧（#root 有子元素），调用方可直接断言。
 * 调用方负责在 afterAll 里 `await app.close()`。
 */
export async function launchApp(): Promise<LaunchedApp> {
  const app = await electron.launch({
    args: [".", "--no-sandbox"],
    cwd: REPO_ROOT,
    env: { ...process.env, NODE_ENV: "development" },
  })
  const page = await app.firstWindow()
  // 等 React 挂载完成，避免对未渲染 DOM 做断言
  await page.waitForSelector("#root > *", { state: "attached" })
  return { app, page }
}

/** 平台级跳过判断。Linux CI 下 Electron e2e 依赖太多（xvfb / libgbm），统一跳过。 */
export const SHOULD_SKIP = process.platform === "linux"
