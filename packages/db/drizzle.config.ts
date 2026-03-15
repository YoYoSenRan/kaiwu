import { defineConfig } from "drizzle-kit"
import * as dotenv from "dotenv"

// 手动加载根目录的 .env
dotenv.config({ path: "../../.env" })

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
})
