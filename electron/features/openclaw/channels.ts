/** openclaw feature 的 IPC 通道常量 */
export const openclawChannels = {
  /** 聊天 */
  chat: {
    send: "openclaw:chat:send",
    abort: "openclaw:chat:abort",
  },
  /** gateway 连接管理 */
  gateway: {
    state: "openclaw:gateway:state",
    /** 主进程 → 渲染进程：event 帧推送 */
    event: "openclaw:gateway:event",
    /** 主进程 → 渲染进程：连接状态变化 */
    status: "openclaw:gateway:status",
    connect: "openclaw:gateway:connect",
    disconnect: "openclaw:gateway:disconnect",
  },
  /** 生命周期相关通道（探测、兼容检查、重启） */
  lifecycle: {
    check: "openclaw:lifecycle:check",
    detect: "openclaw:lifecycle:detect",
    restart: "openclaw:lifecycle:restart",
  },
  /** 插件管理与通信 */
  plugin: {
    /** 主进程 → 渲染进程 */
    event: "openclaw:plugin:event",
    invoke: "openclaw:plugin:invoke",
    /** 主进程 → 渲染进程 */
    status: "openclaw:plugin:status",
    install: "openclaw:plugin:install",
    /** 主进程 → 渲染进程 */
    monitor: "openclaw:plugin:monitor",
    uninstall: "openclaw:plugin:uninstall",
  },
  /** 会话管理 */
  session: {
    list: "openclaw:session:list",
    patch: "openclaw:session:patch",
    create: "openclaw:session:create",
    delete: "openclaw:session:delete",
  },
} as const
