import { ipcRenderer } from "electron"
import { agentChannels } from "./channels"
import type { AgentBridge } from "./types"

export const agentBridge: AgentBridge = {
  list: () => ipcRenderer.invoke(agentChannels.list),
  sync: () => ipcRenderer.invoke(agentChannels.sync),
  detail: (id) => ipcRenderer.invoke(agentChannels.detail, id),
  create: (input) => ipcRenderer.invoke(agentChannels.create, input),
  update: (input) => ipcRenderer.invoke(agentChannels.update, input),
  delete: (id, removeWorkspace = false) => ipcRenderer.invoke(agentChannels.delete, id, removeWorkspace),
  patch: (id, patch) => ipcRenderer.invoke(agentChannels.patch, id, patch),
  cleanupOrphans: () => ipcRenderer.invoke(agentChannels.cleanupOrphans),
  files: {
    list: (id) => ipcRenderer.invoke(agentChannels.files.list, id),
    read: (id, filename) => ipcRenderer.invoke(agentChannels.files.read, id, filename),
    write: (id, filename, content) => ipcRenderer.invoke(agentChannels.files.write, id, filename, content),
  },
  avatar: {
    pick: () => ipcRenderer.invoke(agentChannels.avatar.pick),
  },
}
