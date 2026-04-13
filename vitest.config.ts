import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    root: __dirname,
    include: ["test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    testTimeout: 1000 * 29,
    // 所有 e2e spec 共享同一个 Electron 单实例锁。默认并行会让后启动的实例
    // 抢不到锁直接 app.quit() → exitCode=0 的"干净退出"，testing.md 里专门警告过这个坑。
    fileParallelism: false,
  },
})
