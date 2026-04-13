/** Chat feature 的 IPC 通道常量。对话列表 / 消息 / 成员 / 圆桌讨论。 */
export const chatChannels = {
  list: "chat:list",
  sync: "chat:sync",
  abort: "chat:abort",
  create: "chat:create",
  delete: "chat:delete",
  detail: "chat:detail",
  config: "chat:config",
  event: {
    tool: "chat:event:tool",
    stream: "chat:event:stream",
    roundtable: "chat:event:roundtable",
  },
  members: {
    add: "chat:members:add",
    list: "chat:members:list",
    remove: "chat:members:remove",
  },
  invocations: {
    list: "chat:invocations:list",
  },
  messages: {
    list: "chat:messages:list",
    send: "chat:messages:send",
  },
  roundtable: {
    stop: "chat:roundtable:stop",
    start: "chat:roundtable:start",
    pause: "chat:roundtable:pause",
    resume: "chat:roundtable:resume",
  },
} as const
