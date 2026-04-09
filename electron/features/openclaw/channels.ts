/** openclaw feature 的 IPC 通道常量 */
export const openclawChannels = {
  /** 生命周期相关通道（探测、兼容检查、重启） */
  lifecycle: {
    /** 探测本机 OpenClaw 安装与运行状态 */
    detect: "openclaw:lifecycle:detect",
    /** 校验 kaiwu 插件与当前 OpenClaw 的兼容性 */
    check: "openclaw:lifecycle:check",
    /** 重启 OpenClaw gateway 进程 */
    restart: "openclaw:lifecycle:restart",
  },
  /** 插件同步相关通道 */
  plugin: {
    /** 同步插件源码到 OpenClaw 的 extensions 目录 */
    install: "openclaw:plugin:install",
    /** 卸载已安装的 kaiwu 插件 */
    uninstall: "openclaw:plugin:uninstall",
  },
  /** 插件桥接通信相关通道 */
  bridge: {
    /** 通过插件的 HTTP 路由触发业务动作 */
    invoke: "openclaw:bridge:invoke",
    /** 主进程 → 渲染进程：收到插件推送的桥接事件 */
    event: "openclaw:bridge:event",
    /** 主进程 → 渲染进程：OpenClaw 状态变化 */
    status: "openclaw:bridge:status",
    /** 主进程 → 渲染进程：插件采集的运行时监控事件 */
    monitor: "openclaw:bridge:monitor",
  },
  /** gateway 连接相关通道 */
  gateway: {
    /** 主进程 → 渲染进程：gateway WS 连接状态变化 */
    status: "openclaw:gateway:status",
    /** 获取当前 gateway 连接状态 */
    state: "openclaw:gateway:state",
    /** 显式连接 gateway */
    connect: "openclaw:gateway:connect",
    /** 显式断开 gateway */
    disconnect: "openclaw:gateway:disconnect",
  },
} as const
