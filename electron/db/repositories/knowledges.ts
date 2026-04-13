import { desc, eq } from "drizzle-orm"
import { getDb } from "../client"
import { knowledges } from "../schema"

export type KnowledgeRow = typeof knowledges.$inferSelect
export type KnowledgeInsert = typeof knowledges.$inferInsert
export type KnowledgeUpdate = Partial<Omit<KnowledgeInsert, "id" | "created_at">>

/**
 * knowledges 表的数据访问层。
 * 外部只通过 knowledgesRepo 访问 db，不直接引用 drizzle 或 SQL。
 */
export const knowledgesRepo = {
  /** 按创建时间降序列出所有知识库。 */
  list(): KnowledgeRow[] {
    return getDb().select().from(knowledges).orderBy(desc(knowledges.created_at)).all()
  },

  /** 按 id 查单个知识库，找不到返回 undefined。 */
  findById(id: string): KnowledgeRow | undefined {
    return getDb().select().from(knowledges).where(eq(knowledges.id, id)).get()
  },

  /** 插入一行知识库记录。 */
  insert(row: KnowledgeInsert): void {
    getDb().insert(knowledges).values(row).run()
  },

  /** 更新知识库任意字段子集，空 patch 提前返回。 */
  update(id: string, patch: KnowledgeUpdate): void {
    if (Object.keys(patch).length === 0) return
    getDb().update(knowledges).set(patch).where(eq(knowledges.id, id)).run()
  },

  /** 按 id 删除知识库。 */
  deleteById(id: string): void {
    getDb().delete(knowledges).where(eq(knowledges.id, id)).run()
  },

  /**
   * 事务原语：回调内调用 knowledgesRepo 其他方法时自动参与事务。
   * @param fn 在事务内执行的回调，返回值透传
   */
  transaction<T>(fn: () => T): T {
    return getDb().transaction(() => fn())
  },
}
