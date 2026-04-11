import { safeHandle } from "../../core/ipc"
import { agentChannels } from "./channels"
import { create, getDetail, listFiles, listLocal, patchMeta, pickAvatar, readFile, remove, sync, update, writeFile, cleanupOrphans } from "./service"
import type { AgentCreateInput, AgentPatchInput, AgentUpdateInput } from "./types"

/**
 * 注册 agent feature 的所有 IPC handler。
 * 必须在 app.whenReady() 之后、agent store 首次访问之前调用。
 */
export function setupAgent(): void {
  // --- 列表 / 对齐 / 详情 ---
  safeHandle(agentChannels.list, () => listLocal())
  safeHandle(agentChannels.sync, () => sync())
  safeHandle(agentChannels.detail, (id) => getDetail(id as string))

  // --- 生命周期 ---
  safeHandle(agentChannels.create, (input) => create(input as AgentCreateInput))
  safeHandle(agentChannels.update, (input) => update(input as AgentUpdateInput))
  safeHandle(agentChannels.delete, (id, removeWorkspace) => remove(id as string, removeWorkspace as boolean))
  safeHandle(agentChannels.patch, (id, patch) => patchMeta(id as string, patch as AgentPatchInput))
  safeHandle(agentChannels.cleanupOrphans, () => cleanupOrphans())

  // --- workspace 文件 ---
  safeHandle(agentChannels.files.list, (id) => listFiles(id as string))
  safeHandle(agentChannels.files.read, (id, filename) => readFile(id as string, filename as string))
  safeHandle(agentChannels.files.write, (id, filename, content) => writeFile(id as string, filename as string, content as string))

  // --- avatar picker ---
  safeHandle(agentChannels.avatar.pick, () => pickAvatar())
}
