/** Embedding 设置的 IPC 通道常量。 */
export const embeddingChannels = {
  config: {
    get: "embedding:config:get",
    set: "embedding:config:set",
  },
  model: {
    list: "embedding:model:list",
    download: "embedding:model:download",
    progress: "embedding:model:progress",
  },
  test: "embedding:test",
} as const
