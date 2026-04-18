/**
 * kaiwu agent feature 的 IpcController。
 *
 * 职责：
 *   - 聚合本地 agents 表 + openclaw.agents.list，派生 mine/unsynced/missing 三分区
 *   - detail 单次 RPC 聚合 identity/files/skills/tools 五路数据，失败字段降级 undefined
 *   - create/update/delete 通过 openclaw gateway，kaiwu 本地表做引用维护
 */

import { Controller, Handle, IpcController } from "../../framework"
import { scope } from "../../infra/logger"
import { agents as agentsDomain } from "../openclaw/domains/agents"
import { getGateway } from "../openclaw/runtime"
import * as repo from "./repository"
import type { GatewayClient } from "../openclaw/gateway/client"
import type {
  AgentCreateInput,
  AgentDeleteInput,
  AgentDetail,
  AgentImportInput,
  AgentListEntry,
  AgentListResult,
  AgentUpdateInput,
} from "./contracts"

const log = scope("agent:service")

/**
 * openclaw workspace 的可写白名单。
 *
 * 与 openclaw `gateway/server-methods/agents.ts` 的 ALLOWED_FILE_NAMES 完全一致：
 * 7 个 bootstrap 文件 + memory 文件（主名 MEMORY.md，兼容 memory.md）。
 * 全部是 exact 大写基名，openclaw 侧做字符串精确匹配，非白名单 `files.set` 直接拒绝。
 */
const WRITABLE_WORKSPACE_FILES = new Set([
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "MEMORY.md",
  "memory.md",
])

@Controller("agent")
export class AgentService extends IpcController {
  @Handle("list") async list(): Promise<AgentListResult> {
    const local = repo.listAll()
    const gw = this.gatewayIfConnected()

    if (!gw) {
      return {
        gatewayReady: false,
        gatewayEmpty: false,
        mine: [],
        unsynced: [],
        missing: local.map((r) => ({ agentId: r.agentId, status: "missing" as const, local: r })),
      }
    }

    const res = await agentsDomain.methods.list(gw)
    const gatewayIds = new Set(res.agents.map((a) => a.id))
    const localById = new Map(local.map((l) => [l.agentId, l] as const))
    const gatewayEmpty = res.agents.length === 0

    const mine: AgentListEntry[] = []
    const unsynced: AgentListEntry[] = []
    const missing: AgentListEntry[] = []

    for (const g of res.agents) {
      if (localById.has(g.id)) {
        mine.push({ agentId: g.id, status: "mine", gateway: g, local: localById.get(g.id) })
      } else {
        unsynced.push({ agentId: g.id, status: "unsynced", gateway: g })
      }
    }

    if (!gatewayEmpty) {
      for (const l of local) {
        if (!gatewayIds.has(l.agentId)) {
          missing.push({ agentId: l.agentId, status: "missing", local: l })
        }
      }
    }

    return { gatewayReady: true, gatewayEmpty, defaultId: res.defaultId, mine, unsynced, missing }
  }

  @Handle("detail") async detail(agentId: string): Promise<AgentDetail> {
    const gw = this.gatewayIfConnected()
    if (!gw) return { agentId }

    // 只拉 UI 真正用到的 4 路：gateway 基础行 / identity / workspace files / skills。
    // tools.catalog / tools.effective 未渲染，暂不拉；未来加 Tools tab 再回来聚合。
    const [listRes, identity, files, skills] = await Promise.allSettled([
      agentsDomain.methods.list(gw),
      agentsDomain.methods.identity(gw, { agentId }),
      agentsDomain.methods.filesList(gw, { agentId }),
      agentsDomain.methods.skillsStatus(gw, { agentId }),
    ])

    return {
      agentId,
      gateway: listRes.status === "fulfilled" ? listRes.value.agents.find((a) => a.id === agentId) : undefined,
      identity: identity.status === "fulfilled" ? identity.value : undefined,
      files: files.status === "fulfilled"
        ? {
            workspace: files.value.workspace,
            files: files.value.files.map((f) => ({ ...f, writable: WRITABLE_WORKSPACE_FILES.has(f.name) })),
          }
        : undefined,
      skills: skills.status === "fulfilled" ? skills.value : undefined,
    }
  }

  @Handle("create") async create(input: AgentCreateInput): Promise<{ agentId: string }> {
    const gw = this.requireGateway()
    const res = await agentsDomain.methods.create(gw, input)
    repo.insert(res.agentId)
    log.info(`agent created: ${res.agentId}`)
    return { agentId: res.agentId }
  }

  @Handle("update") async update(input: AgentUpdateInput): Promise<{ ok: true }> {
    const gw = this.requireGateway()
    await agentsDomain.methods.update(gw, input)
    repo.touch(input.agentId)
    return { ok: true }
  }

  @Handle("delete") async delete(input: AgentDeleteInput): Promise<{ ok: true; removedBindings?: number }> {
    if (input.strategy.kind === "unlink") {
      repo.remove(input.agentId)
      log.info(`agent unlinked: ${input.agentId}`)
      return { ok: true }
    }
    const gw = this.requireGateway()
    const res = await agentsDomain.methods.delete(gw, {
      agentId: input.agentId,
      deleteFiles: input.strategy.deleteFiles,
    })
    repo.remove(input.agentId)
    log.info(`agent purged: ${input.agentId}, deleteFiles=${input.strategy.deleteFiles}`)
    return { ok: true, removedBindings: res.removedBindings }
  }

  @Handle("importUnsynced") async importUnsynced(input: AgentImportInput): Promise<{ imported: number }> {
    const n = repo.insertMany(input.agentIds)
    log.info(`imported ${n} unsynced agents`)
    return { imported: n }
  }

  @Handle("filesGet") async filesGet(input: { agentId: string; name: string }): Promise<{ content: string }> {
    const gw = this.requireGateway()
    const res = await agentsDomain.methods.filesGet(gw, input)
    return { content: res.file.content }
  }

  @Handle("filesSet") async filesSet(input: { agentId: string; name: string; content: string }): Promise<{ ok: true }> {
    const gw = this.requireGateway()
    await agentsDomain.methods.filesSet(gw, input)
    return { ok: true }
  }

  /** 尝试拿 gateway，未连接或未初始化返回 null。 */
  private gatewayIfConnected(): GatewayClient | null {
    try {
      const gw = getGateway()
      return gw.getState().status === "connected" ? gw : null
    } catch {
      return null
    }
  }

  /** 需要 gateway 连接的操作入口，未连接直接抛错。 */
  private requireGateway(): GatewayClient {
    const gw = this.gatewayIfConnected()
    if (!gw) throw new Error("gateway not connected")
    return gw
  }
}
