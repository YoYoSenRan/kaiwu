# openclaw feature — 架构契约

kaiwu 主进程与 OpenClaw(龙虾)集成层。本模块是全应用的基础设施:gateway 连接、bridge 插件生命周期、状态聚合、RPC 转发 —— 其他 feature 通过 `runtime` 单例消费本模块能力。

## 一句话概览

```
kaiwu renderer  ←IPC→  ipc/*  ←→  runtime(gateway/server/scanner/bus)  ←WS→  OpenClaw gateway
                                       ↑
                                kaiwu 插件 ──WS→ bridge.server
```

## 心智模型:6 个知识边界

| 层   | 目录         | 关心什么                               | 不关心什么               |
| ---- | ------------ | -------------------------------------- | ------------------------ |
| 契约 | `contracts/` | wire 类型、事件 schema、RPC 参数/结果  | 运行时行为(0 运行时代码) |
| 发现 | `discovery/` | OpenClaw 装在哪、什么部署形态、版本    | WS 怎么连、插件怎么安装  |
| 传输 | `transport/` | WS socket、RPC 请求/响应关联、事件分发 | 连接哪个 URL、为何连接   |
| 网关 | `gateway/`   | 编排 discovery + transport、连接状态机 | 插件文件                 |
| 桥接 | `bridge/`    | 本地 WS server、kaiwu 插件文件安装     | gateway 连接             |
| 内核 | `kernel/`    | 总线、中间件管道、能力查询、域注册     | 具体域实现               |

聚合层(`status.ts`)消费发现 + 桥接,推出 `OpenClawStatus`。
接入层(`ipc/`)仅做薄壳,把 kernel/domains 暴露成 IPC Controller。
外部契约(`api.ts`)是 renderer 能看到的唯一入口。

## 三个扩展点

新增能力走以下三条路径之一。**都不该改核心代码**。

### 1. 新 RPC 域 → `domains/xxx.ts`

```ts
import { domain } from "../kernel/registry"

export const documents = domain({
  namespace: "openclaw.documents",
  methods: {
    search: (gw, p: SearchParams) => gw.call<SearchResult>("documents.search", p),
    get: (gw, p: { id: string }) => gw.call<Doc>("documents.get", p),
  },
})
```

`index.ts` 副作用 import 后,自动获得:

- renderer 侧 IPC Controller(`openclaw.documents`)
- 主进程内部 SDK(`runtime.rpc.documents.search(...)`)

### 2. 订阅/发射领域事件 → `runtime.bus`

```ts
import { runtime } from "@features/openclaw/runtime"

runtime.bus.on("gateway.connected", () => {
  /* 重新订阅 */
})
runtime.bus.on("bridge.installed", (status) => {
  /* 刷新 UI */
})
```

事件 schema 在 `contracts/events.ts`,新增事件加一行 union。

### 3. 插入 RPC 调用中间件 → `runtime.gateway.use`

```ts
runtime.gateway.use(async (ctx, next) => {
  const t0 = Date.now()
  try {
    return await next()
  } finally {
    log.debug(`${ctx.method} ${Date.now() - t0}ms`)
  }
})
```

用于埋点、重试、鉴权刷新、限流。

## 硬规则

- **`contracts/` 不 import 任何运行时代码**
- **`transport/` 不 import `discovery/`**(传输层只处理"已有 URL")
- **`bridge/` 不 import `gateway/`**(本地 server 独立于远端连接)
- **新增能力 = 新增文件 + 注册**,不改多处
- **fail-fast**:`runtime.gateway` / `runtime.server` 在构造时注入,调用点假定 non-null;连接未就绪由 `call()` 自行抛错
- **contracts 是稳定契约**,变更需所有消费者同步更新,不加兼容层

## 当前状态(改造中)

模块正在从旧结构迁移到上述分层,分 8 步增量推进:

1. [x] kernel/bus + contracts/events + AGENTS.md
2. [x] container.ts 拆成 runtime + events/channels + events/publisher,`emit*` → `publish*`
3. [x] chat/agents/sessions/models contract 合并到 contracts/rpc,删 4 空目录
4. [x] kernel/pipeline 接入 gateway/client,`use(middleware)` 开放
5. [x] kernel/registry + domains/\* 自动生成 Controller,删 rpc.ts,改 app/ipc.ts 走 facade
6. [x] discovery/ 目录拆出 (scanner/deployment/credentials/cli/lock/port/version)
7. [x] transport/ 目录拆出 (socket/caller/stream/heartbeat/reconnect/signal/manager),EventEmitter → EventStream
8. [x] 收尾清理:
   - 类型全部迁到 contracts/\* (frames 保留 gateway/contract.ts, 其余拆 connection/install/plugin/status)
   - 删 gateway/types.ts + plugin/types.ts
   - plugin/ → bridge/ (目录重命名), PluginService → BridgeService
   - paths.ts 拆成 discovery/paths.ts + bridge/paths.ts
   - bridge.ts (renderer 桥) → api.ts (避免与 bridge/ 冲突)

## 当前文件树

```
openclaw/
├── AGENTS.md
├── index.ts                    # Controller facade
├── api.ts                      # renderer createBridge (preload 层)
├── runtime.ts                  # scanner/gateway/server 共享单例
├── status.ts                   # (待建) computeStatus 迁移
│
├── contracts/
│   ├── connection.ts           # ConnectionState / ConnectParams
│   ├── events.ts               # BusEvents union
│   ├── install.ts              # ScanResult / Deployment / Capabilities
│   ├── plugin.ts               # PluginEvent / Invoke / Credentials
│   ├── rpc.ts                  # chat/sessions/agents/models 类型
│   └── status.ts               # OpenClawStatus / Compatibility
│
├── kernel/
│   ├── bus.ts                  # 类型化 pub/sub
│   ├── pipeline.ts             # RPC 中间件
│   └── registry.ts             # domain() + buildController()
│
├── discovery/
│   ├── paths.ts                # configDir / openclawRoot
│   ├── scanner.ts              # InstallationScanner (TTL 缓存)
│   ├── deployment.ts           # 部署推断 + 能力矩阵
│   ├── version.ts              # kaiwu ↔ openclaw 版本兼容
│   ├── credentials.ts          # 读 gateway auth
│   ├── cli.ts                  # openclaw CLI 执行器
│   ├── port.ts
│   └── lock.ts
│
├── transport/
│   ├── socket.ts
│   ├── caller.ts               # RPC 请求/响应
│   ├── stream.ts               # 事件分发 (原 EventEmitter, 改 EventStream)
│   ├── heartbeat.ts
│   ├── reconnect.ts
│   ├── signal.ts
│   └── manager.ts              # 三件套装配
│
├── gateway/                    # 连接协议 + 编排
│   ├── client.ts
│   ├── service.ts              # IPC Controller
│   ├── state.ts                # reducer
│   ├── keys.ts                 # sessionKey 提取
│   ├── contract.ts             # wire frames (待迁 contracts/frames.ts)
│   ├── handshake.ts
│   └── auth.ts                 # 设备密钥对
│
├── bridge/                     # 本地 WS server + kaiwu 插件管理
│   ├── service.ts              # BridgeService @Controller("openclaw.plugin")
│   ├── server.ts
│   ├── manager.ts              # 生命周期
│   ├── sync.ts                 # installPluginFiles
│   ├── connect.ts              # handshake file
│   ├── call.ts                 # /kaiwu/invoke
│   ├── router.ts               # event/monitor 分流
│   ├── security.ts
│   └── paths.ts                # bridgeDir / handshake path
│
├── domains/                    # RPC 域, 每个 1 文件
│   ├── chat.ts
│   ├── sessions.ts
│   ├── agents.ts
│   └── models.ts
│
├── events/
│   ├── channels.ts             # IPC channel 常量
│   └── publisher.ts            # publish* helpers
│
├── ipc/                        # (未启用, 当前 Controller 散落在 gateway/bridge/status/)
│
└── status/
    └── service.ts              # StatusController + pushStatus
```

**待办**:

- `gateway/contract.ts` 迁 `contracts/frames.ts`(wire 帧归契约层)
- `status/service.ts` 拆成 `status.ts` (compute/publish 纯函数) + `ipc/status.ts` (Controller)
- 同理 `gateway/service.ts` / `bridge/service.ts` 薄壳化后迁 `ipc/`
- `kernel/caps.ts` 能力查询层
- 部署策略可插拔(现内联 `discovery/deployment.ts` 里)

以上是可选增量优化,已满足"新增能力 = 新增文件 + 注册"。
