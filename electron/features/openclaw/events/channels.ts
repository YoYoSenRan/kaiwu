/**
 * renderer 可见的 IPC channel 字符串常量。
 *
 * 一处集中,搜索某 channel 定位即中。publisher.ts 按这些常量向 renderer 推送,
 * preload 侧(api.ts)订阅同样常量,两端契约对齐。
 */

export const channels = {
  gateway: {
    status: "openclaw.gateway:status",
    event: "openclaw.gateway:event",
  },
  plugin: {
    event: "openclaw.plugin:event",
    monitor: "openclaw.plugin:monitor",
  },
  status: {
    change: "openclaw.status:change",
  },
} as const
