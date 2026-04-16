import { defineConfig } from "drizzle-kit"

// drizzle-kit 只在 dev 时用：执行 `pnpm db:generate` 对比 schema 与上次 snapshot 产出 migration。
// 运行时的 drizzle instance 在 electron/database/client.ts，不走这个配置。
export default defineConfig({
  dialect: "sqlite",
  schema: "./electron/database/schema.ts",
  out: "./electron/database/migrations",
  verbose: true,
  strict: true,
})
