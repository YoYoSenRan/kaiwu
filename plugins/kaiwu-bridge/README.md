# kaiwu-bridge

Kaiwu ↔ OpenClaw 双向桥接插件。由 kaiwu 项目维护源码，安装时同步到用户本机
`~/.openclaw/extensions/kaiwu-bridge/`（Windows: `%APPDATA%\.openclaw\extensions\kaiwu-bridge\`）。

## 通信通道

- **入站（kaiwu → plugin）**：通过 OpenClaw gateway（默认 `127.0.0.1:18789`）访问
  `/kaiwu/*` HTTP 路由。路由由插件注册，OpenClaw 托管。
  - `GET  /kaiwu/health` — 健康检查
  - `GET  /kaiwu/version` — 协议版本与插件版本
  - `POST /kaiwu/config` — 热更新配置
  - `POST /kaiwu/invoke` — 触发业务动作
  - `POST /kaiwu/shutdown` — 请求插件停止（不杀 OpenClaw）
  - 鉴权：`Authorization: Bearer <token>` 或 `?token=<token>` 查询参数

- **出站（plugin → kaiwu）**：插件作为 WebSocket 客户端连接
  `ws://127.0.0.1:<bridgePort>/kaiwu-bridge?token=<token>`，port 和 token 从
  handshake 文件或 pluginConfig 读取。

## handshake 文件

路径：`<插件 rootDir>/.kaiwu-handshake.json`

```json
{
  "port": 41923,
  "token": "random-token",
  "pid": 12345,
  "startedAt": 1712553600000
}
```

由 kaiwu 主进程在启动本地 bridge server 后写入。插件在 `gateway_start` 钩子里读取。

## 目录结构

```
kaiwu-bridge/
├── package.json             # openclaw.extensions / compat / build
├── openclaw.plugin.json     # manifest 与 configSchema
├── tsconfig.json            # 独立 TS 配置
├── sdk.d.ts                 # 最小 SDK 环境类型（避免子 node_modules）
├── api.ts                   # SDK 重导出
├── index.ts                 # definePluginEntry 入口
└── src/
    ├── protocol.ts          # JSON 协议定义
    ├── config.ts            # handshake / pluginConfig 读取
    ├── bridge-client.ts     # WS 客户端（出站）
    ├── http-routes.ts       # HTTP 路由处理（入站）
    └── hooks.ts             # gateway_start / gateway_stop 钩子
```

## 开发调试

在 kaiwu 根目录运行：

```sh
pnpm plugin:dev     # watch 同步 + 自动重启 OpenClaw gateway
pnpm plugin:sync    # 一次性同步到本机 OpenClaw
pnpm plugin:check   # 只检查兼容性，不安装
```

> 阶段 3 之后这些脚本才可用。

## 版本兼容

- 最低 OpenClaw：`2026.3.1`（跨过 `registerHttpHandler` 废弃的 breaking change）
- 协议版本：`1`（见 `src/protocol.ts` 的 `BRIDGE_PROTOCOL_VERSION`）

## 扩展指引

- 新增出站事件 → 在 `src/protocol.ts` 里加一个 `BridgeEnvelope` 变体并纳入
  `BridgeOutboundMessage` 联合
- 新增入站命令 → 在 `src/http-routes.ts` 的 dispatcher 里加一个分支
- 要用 OpenClaw 的更多 hook（`session_started` 等）→ 在 `src/hooks.ts` 里
  `registerHook` 并 `bridgeClient.send` 对应事件
