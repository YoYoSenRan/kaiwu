/** openclaw feature 的 IPC 通道常量 */
export const openclawChannels = {
  /** 生命周期相关通道（探测、兼容检查、重启） */
  lifecycle: {
    detect: "openclaw:lifecycle:detect",
    check: "openclaw:lifecycle:check",
    restart: "openclaw:lifecycle:restart",
  },
  /** 插件管理与通信 */
  plugin: {
    install: "openclaw:plugin:install",
    uninstall: "openclaw:plugin:uninstall",
    invoke: "openclaw:plugin:invoke",
    /** 主进程 → 渲染进程 */
    event: "openclaw:plugin:event",
    /** 主进程 → 渲染进程 */
    status: "openclaw:plugin:status",
    /** 主进程 → 渲染进程 */
    monitor: "openclaw:plugin:monitor",
  },
  /** gateway 连接管理 */
  gateway: {
    state: "openclaw:gateway:state",
    connect: "openclaw:gateway:connect",
    disconnect: "openclaw:gateway:disconnect",
    /** 主进程 → 渲染进程：连接状态变化 */
    status: "openclaw:gateway:status",
    /** 主进程 → 渲染进程：event 帧推送 */
    event: "openclaw:gateway:event",
  },
  /** 聊天 */
  chat: {
    send: "openclaw:chat:send",
    abort: "openclaw:chat:abort",
  },
  /** 会话管理 */
  session: {
    create: "openclaw:session:create",
    list: "openclaw:session:list",
    patch: "openclaw:session:patch",
    delete: "openclaw:session:delete",
  },
} as const
