/** Knowledge feature 的 IPC 通道常量。 */
export const knowledgeChannels = {
  base: {
    list: "knowledge:base:list",
    create: "knowledge:base:create",
    update: "knowledge:base:update",
    delete: "knowledge:base:delete",
    detail: "knowledge:base:detail",
  },
  doc: {
    list: "knowledge:doc:list",
    upload: "knowledge:doc:upload",
    delete: "knowledge:doc:delete",
    retry: "knowledge:doc:retry",
    chunks: "knowledge:doc:chunks",
    progress: "knowledge:doc:progress",
  },
  search: {
    query: "knowledge:search:query",
  },
  bind: {
    list: "knowledge:bind:list",
    set: "knowledge:bind:set",
  },
} as const
