import { nanoid } from "nanoid"
import { integer, text } from "drizzle-orm/sqlite-core"

/**
 * 通用列 helper。所有业务表直接展开使用，保证 id / created_at / updated_at 的形态统一。
 *
 * 使用：
 * ```ts
 * export const knowledges = sqliteTable("knowledges", {
 *   id: pk(),
 *   name: text("name").notNull(),
 *   ...timestamps(),
 * })
 * ```
 */

/** 文本主键。默认用 nanoid() 生成 21 字符 URL-safe id。 */
export const pk = () => text("id").primaryKey().$defaultFn(() => nanoid())

/** 创建时间：毫秒时间戳。insert 时默认 Date.now()。 */
export const createdAt = () =>
  integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())

/** 更新时间：毫秒时间戳。insert 默认 Date.now()，drizzle update 时自动刷新。 */
export const updatedAt = () =>
  integer("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdate(() => Date.now())

/** 一次性展开 created_at + updated_at。 */
export const timestamps = () => ({
  created_at: createdAt(),
  updated_at: updatedAt(),
})
