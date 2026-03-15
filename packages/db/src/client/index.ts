import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../schema"

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error("Database environment variables are missing (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)")
}

const client = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

export const db = drizzle(client, { schema })
