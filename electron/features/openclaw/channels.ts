/** openclaw feature 的 IPC 通道常量 */
export const openclawChannels = {
  /** 探测本机 OpenClaw 安装与运行状态 */
  detect: "openclaw:detect",
  /** 通过插件的 HTTP 路由触发业务动作 */
  invoke: "openclaw:invoke",
  /** 重启 OpenClaw gateway 进程 */
  restart: "openclaw:restart",
  /** 主进程 → 渲染进程：收到插件推送的桥接事件 */
  bridgeEvent: "openclaw:bridge-event",
  /** 校验 kaiwu-bridge 插件与当前 OpenClaw 的兼容性 */
  checkCompat: "openclaw:check-compat",
  /** 同步插件源码到 OpenClaw 的 extensions 目录 */
  installBridge: "openclaw:install-bridge",
  /** 主进程 → 渲染进程：OpenClaw 状态变化 */
  statusChanged: "openclaw:status-changed",
  /** 卸载已安装的 kaiwu-bridge 插件 */
  uninstallBridge: "openclaw:uninstall-bridge",
} as const
