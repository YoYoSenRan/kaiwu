import { eq } from "drizzle-orm"
import { getDb } from "../client"
import { agentKnowledge, knowledges } from "../schema"
import type { KnowledgeRow } from "./knowledges"

/**
 * agent_knowledge 关联表的数据访问层。
 * 负责 Agent ↔ 知识库多对多绑定关系的增删查。
 */
export const bindingsRepo = {
  /** 查询某个 agent 绑定的所有知识库，返回完整 KnowledgeRow。 */
  listByAgent(agentId: string): KnowledgeRow[] {
    return getDb()
      .select({
        id: knowledges.id,
        name: knowledges.name,
        description: knowledges.description,
        embedding_model: knowledges.embedding_model,
        chunk_count: knowledges.chunk_count,
        doc_count: knowledges.doc_count,
        created_at: knowledges.created_at,
        updated_at: knowledges.updated_at,
      })
      .from(agentKnowledge)
      .innerJoin(knowledges, eq(agentKnowledge.kb_id, knowledges.id))
      .where(eq(agentKnowledge.agent_id, agentId))
      .all()
  },

  /**
   * 全量替换某 agent 的知识库绑定。
   * 先删除旧绑定，再逐条插入新绑定。
   * @param agentId agent 的本地 id
   * @param kbIds 新的知识库 id 列表
   */
  setForAgent(agentId: string, kbIds: string[]): void {
    getDb().delete(agentKnowledge).where(eq(agentKnowledge.agent_id, agentId)).run()
    for (const kbId of kbIds) {
      getDb().insert(agentKnowledge).values({ agent_id: agentId, kb_id: kbId }).run()
    }
  },

  /** 删除某知识库的所有 agent 绑定，用于删除知识库时级联清理。 */
  deleteByKb(kbId: string): void {
    getDb().delete(agentKnowledge).where(eq(agentKnowledge.kb_id, kbId)).run()
  },
}
