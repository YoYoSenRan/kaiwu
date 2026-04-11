/** Agent feature 的 IPC 通道常量。本地 sqlite / workspace fs / avatar 对话框。 */
export const agentChannels = {
  list: "agent:list",
  sync: "agent:sync",
  patch: "agent:patch",
  detail: "agent:detail",
  create: "agent:create",
  delete: "agent:delete",
  update: "agent:update",
  /** workspace 文件读写 */
  files: {
    list: "agent:files:list",
    read: "agent:files:read",
    write: "agent:files:write",
  },
  /** 原生文件选择对话框 */
  avatar: {
    pick: "agent:avatar:pick",
  },
  /** 清理本地 orphan-local 记录 */
  cleanupOrphans: "agent:cleanup-orphans",
} as const
