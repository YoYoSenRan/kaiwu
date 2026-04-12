import { asc, desc, eq } from "drizzle-orm"
import { getDb } from "../client"
import { agents } from "../schema"

/** drizzle 推导：AgentRow = select 一行的完整类型，AgentInsert = insert 一行的必填/可选字段。 */
export type AgentRow = typeof agents.$inferSelect
export type AgentInsert = typeof agents.$inferInsert

/** 可批量更新的字段白名单（和 UPDATE agents SET ... 的 updated_at 一并处理）。 */
export type AgentUpdate = Partial<Omit<AgentInsert, "id" | "created_at">>

/**
 * agents 表的数据访问层。
 * 外部只通过 agentsRepo 访问 db，不直接引用 drizzle 或 SQL。
 * 方法内部用的是 client.ts 里的 drizzle 单例，但在 `transaction` 回调内执行时
 * 会自动参与 better-sqlite3 的同步事务（无需切换 db 句柄）。
 */
export const agentsRepo = {
  /** kaiwu 列表页的默认排序：hidden 升序 → pinned 降序 → sort_order 升序 → created_at 降序。 */
  list(): AgentRow[] {
    return getDb().select().from(agents).orderBy(asc(agents.hidden), desc(agents.pinned), asc(agents.sort_order), desc(agents.created_at)).all()
  },

  /** 不带排序的全量拉取，用于 sync 时和远端对比。 */
  listAll(): AgentRow[] {
    return getDb().select().from(agents).all()
  },

  /** 按本地 id 查单个 agent，找不到返回 undefined（由 service 决定是否抛错）。 */
  findById(id: string): AgentRow | undefined {
    return getDb().select().from(agents).where(eq(agents.id, id)).get()
  },

  /** 按 gateway 侧的 agent id（唯一）查单个。主要用于 ensureNotOccupied 冲突检测。 */
  findByAgent(agent: string): AgentRow | undefined {
    return getDb().select().from(agents).where(eq(agents.agent, agent)).get()
  },

  /** 插入一行。字段按 AgentInsert 推导，drizzle 会根据 notNull/default 自动校验。 */
  insert(row: AgentInsert): void {
    getDb().insert(agents).values(row).run()
  },

  /** 更新任意字段子集。updated_at 由调用方在 patch 里显式传入，保持"数据原语不替业务决策"。 */
  update(id: string, patch: AgentUpdate): void {
    if (Object.keys(patch).length === 0) return
    getDb().update(agents).set(patch).where(eq(agents.id, id)).run()
  },

  /** sync 里把本地独有的 agent 标记为孤儿。 */
  markOrphan(id: string, now: number): void {
    getDb().update(agents).set({ sync_state: "orphan-local", last_synced_at: now }).where(eq(agents.id, id)).run()
  },

  /** 按本地 id 删除。 */
  deleteById(id: string): void {
    getDb().delete(agents).where(eq(agents.id, id)).run()
  },

  /** 清理所有 orphan-local 记录，返回删除条数。 */
  deleteOrphans(): number {
    const result = getDb().delete(agents).where(eq(agents.sync_state, "orphan-local")).run()
    return result.changes
  },

  /**
   * 事务原语：在回调内调用 agentsRepo 其他方法时自动参与事务。
   * 依赖 better-sqlite3 的特性——transaction 回调内对同一连接的任何写都在同一事务里，
   * 所以 fn 里继续调 agentsRepo.xxx() 走全局 db 单例也能落到同一事务。
   */
  transaction<T>(fn: () => T): T {
    return getDb().transaction(() => fn())
  },
}
