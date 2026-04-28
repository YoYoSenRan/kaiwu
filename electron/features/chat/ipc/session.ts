/**
 * @Handle("session:*") 处理器。service.ts 的方法 body 抽到这里,service.ts 保留 @Handle 装饰器但只做 1-行 delegate。
 */

import { nanoid } from "nanoid"
import { buildSessionInitParams } from "../keys"
import { deleteSession as deleteSessionRow, getSession, insertMember, insertSession, listMembers, listSessions, setSessionArchived, setSessionSupervisor } from "../repository"
import type { ChatSession, CreateSessionInput } from "../types"
import type { ChatService } from "../service"

export async function list(): Promise<ChatSession[]> {
  return listSessions()
}

export async function create(svc: ChatService, input: CreateSessionInput): Promise<ChatSession> {
  if (input.mode === "direct" && input.members.length !== 1) throw new Error("direct chat must have exactly 1 member")
  if (input.mode === "group" && input.members.length < 1) throw new Error("group chat must have at least 1 member")
  const sessionId = nanoid()
  insertSession({
    id: sessionId,
    mode: input.mode,
    label: input.label ?? null,
    openclawKey: null,
    budget: input.budget ?? {},
    strategy: { kind: "broadcast" },
    // supervisor 先空,member 落库后回填(取首个 member 作默认,直聊时该 member 即唯一成员)
    supervisorId: null,
  })
  let firstMemberId: string | null = null
  let resolvedSupervisorId: string | null = null
  for (const m of input.members) {
    const memberId = nanoid()
    if (!firstMemberId) firstMemberId = memberId
    if (input.supervisorId && input.supervisorId === m.agentId) resolvedSupervisorId = memberId
    const params = buildSessionInitParams({ sessionId, memberId, agentId: m.agentId, mode: input.mode, replyMode: m.replyMode })
    await svc.createOpenClawSession(params.key, m.agentId)
    insertMember({ id: memberId, sessionId, agentId: m.agentId, openclawKey: params.key, replyMode: m.replyMode, seedHistory: m.seedHistory ?? false })
  }
  // 默认值:用户传 supervisorId(agentId)→ 解析为 memberId;否则取首个 member
  const finalSupervisorId = resolvedSupervisorId ?? firstMemberId
  if (finalSupervisorId) {
    setSessionSupervisor(sessionId, finalSupervisorId)
  }
  const created = getSession(sessionId)
  if (!created) throw new Error("failed to load created session")
  return created
}

export async function deleteOne(svc: ChatService, id: string): Promise<void> {
  const members = listMembers(id)
  for (const m of members) {
    await svc.deleteOpenClawSession(m.openclawKey).catch(() => {
      /* best effort */
    })
  }
  deleteSessionRow(id)
}

export async function archive(id: string, archived: boolean): Promise<void> {
  setSessionArchived(id, archived)
}

export async function reconcile(svc: ChatService, sessionId: string): Promise<{ imported: number; updated: number }> {
  return svc.reconcileSession(sessionId)
}
