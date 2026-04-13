import { eq } from "drizzle-orm"
import { getDb } from "../client"
import { knowledgeDocuments } from "../schema"

export type KnowledgeDocRow = typeof knowledgeDocuments.$inferSelect
export type KnowledgeDocInsert = typeof knowledgeDocuments.$inferInsert
export type KnowledgeDocUpdate = Partial<Omit<KnowledgeDocInsert, "id" | "kb_id" | "created_at">>

/**
 * knowledge_documents 表的数据访问层。
 * 外部只通过 documentsRepo 访问 db，不直接引用 drizzle 或 SQL。
 */
export const documentsRepo = {
  /** 按知识库 id 列出所有文档。 */
  listByKb(kbId: string): KnowledgeDocRow[] {
    return getDb().select().from(knowledgeDocuments).where(eq(knowledgeDocuments.kb_id, kbId)).all()
  },

  /** 按 id 查单个文档，找不到返回 undefined。 */
  findById(id: string): KnowledgeDocRow | undefined {
    return getDb().select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id)).get()
  },

  /** 插入一行文档记录。 */
  insert(row: KnowledgeDocInsert): void {
    getDb().insert(knowledgeDocuments).values(row).run()
  },

  /** 更新文档任意字段子集，空 patch 提前返回。 */
  update(id: string, patch: KnowledgeDocUpdate): void {
    if (Object.keys(patch).length === 0) return
    getDb().update(knowledgeDocuments).set(patch).where(eq(knowledgeDocuments.id, id)).run()
  },

  /** 按 id 删除单个文档。 */
  deleteById(id: string): void {
    getDb().delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id)).run()
  },

  /** 删除知识库下全部文档，用于删除知识库时级联清理。 */
  deleteByKb(kbId: string): void {
    getDb().delete(knowledgeDocuments).where(eq(knowledgeDocuments.kb_id, kbId)).run()
  },
}
