import { defineConfig } from "drizzle-kit"

// drizzle-kit 只在 dev 时用：执行 `pnpm db:generate` 对比 schema 与上次 snapshot 产出 migration。
// 运行时的 drizzle instance 在 electron/db/client.ts，不走这个配置。
export default defineConfig({
  dialect: "sqlite",
  schema: "./electron/db/schema.ts",
  out: "./electron/db/migrations",
  verbose: true,
  strict: true,
})
