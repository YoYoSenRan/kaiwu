---
paths:
  - "electron/**/*.ts"
---

# IPC 设计模板

## 文件结构

每个 IPC 能力模块在 `electron/<name>/` 下固定 4-5 个文件：

```
<name>/
├── channels.ts     # IPC channel 常量（as const）
├── types.ts        # 类型定义（包括 Bridge 接口）
├── service.ts      # 业务逻辑，可选，复杂 feature 才拆
├── ipc.ts          # ipcMain.handle 注册，供 main.ts 调用
└── bridge.ts       # preload 暴露给 renderer 的 API
```

**没有 `index.ts` barrel**。原因见下方"禁止 barrel"小节。

## 大型 feature 的子目录例外

当 feature 需要对接多个能力域（比如 `openclaw` 要桥接 session / chat / hook 等）时，允许在 feature 目录下开子目录**分域归档**：

```
openclaw/
├── channels.ts / types.ts / ipc.ts / bridge.ts / service.ts   # 顶层聚合
├── core/                 # 模块内部基础设施（不属于任何一个能力域）
│   └── *.ts
├── session/              # 一个能力域 = 一个子目录
│   └── *.ts
├── chat/
│   └── *.ts
└── hook/
    └── *.ts
```

**约束**（和下方 barrel 禁令配合）：

1. **子目录内不得创建 `index.ts` barrel**（原因同下）
2. **外部 import 必须走具体文件路径**：`./session/ipc` / `./session/bridge`，不是 `./session`
3. **顶层 `ipc.ts` 负责聚合**：调各子目录的 `setup<Cap>()`
4. **顶层 `bridge.ts` 负责聚合**：组合各子目录的 bridge 片段为单一 `<feature>Bridge` 对象
5. **命名惯例**：能力域子目录名 = 单数名词（`session` / `chat` / `hook`），不用复数、不加后缀
6. **适用门槛**：feature 平铺超过 10 个文件 或 承载 ≥3 个独立能力域时才启用；小 feature 仍然扁平

## 文件职责铁律

- `service.ts` 不 import `ipcMain`、不 import `BrowserWindow`（通过 `core/window` 的 `getMainWindow()` 获取）
- `ipc.ts` 不写业务逻辑，只做参数转发和 service 调用
- `bridge.ts` 不 import `service.ts` / `ipc.ts`（会导致 main 代码污染 preload bundle）
- `channels.ts` 只放常量，`types.ts` 只放类型
- feature 之间禁止互相 import

## ⛔ 禁止 barrel（index.ts）

**feature 目录下不得创建 `index.ts` 做 re-export**。原因：

barrel 会把 main 端代码（`setupX`）和 preload 端代码（`xBridge`）打包到同一个 export 出口。当 `preload.ts` 从 barrel 导入 bridge 时，rollup 会沿着 barrel 的 re-export 链把 `ipc.ts` / `service.ts` 拉进 preload bundle，进而把 `node:path` / `BrowserWindow` / `ipcMain` 等主进程 API 塞进 preload。

**后果**：preload 脚本在 sandbox 渲染上下文启动时报错 `module not found: path`，`contextBridge.exposeInMainWorld` 根本不执行，`window.api` 全部 undefined，renderer 全线崩溃。

**正确做法**：`main.ts` 和 `preload.ts` 直接从具体文件 import：

```ts
// electron/main.ts — 从 ipc.ts 或 service.ts 直接导入
import { setupWindow } from "./window/ipc"
import { setupUpdater } from "./updater/ipc"
import { setupProtocol, flushPendingDeepLink } from "./deeplink/service"

// electron/preload.ts — 从 bridge.ts 直接导入
import { windowBridge } from "./window/bridge"
import { updaterBridge } from "./updater/bridge"
import { deeplinkBridge } from "./deeplink/bridge"
```

这样 rollup 的依赖图在 `bridge.ts` 处自然截断，不会误拉主进程代码。

## 模板代码

### channels.ts

```ts
export const windowChannels = {
  window: {
    minimize: "chrome:window:minimize",
    maximize: "chrome:window:maximize",
    close: "chrome:window:close",
    state: "chrome:window:state",
    change: "chrome:window:change",
  },
} as const
```

## channel 命名规范（必读）

### 字符串格式

**统一使用 `feature:domain:action` 三层冒号结构**。扁平小 feature 可省略 domain，变为 `feature:action`。

- ✅ `updater:event:progress`
- ✅ `chrome:window:change`
- ❌ `chrome:maximized-changed`（含短横线）
- ❌ `openclaw:connectGateway`（camelCase）

### action 规则

- **单字优先**：能用单个英文单词就不用多词。`check` 优于 `check-compat`，`state` 优于 `is-maximized`，`done` 优于 `downloaded`。
- 确实无法单字表达时，才用 kebab-case 连接（如 `status-changed` 仅在历史遗留场景允许）。

### 嵌套对象组织

- **小 feature**（≤5 个 channel）：允许扁平对象，直接 `export const xChannels = { write: "log:write" }`。
- **大 feature / 多域 feature**（>5 个 channel 或明显跨域）：必须用**一层嵌套对象**按域分组。

```ts
export const openclawChannels = {
  lifecycle: { detect: "openclaw:lifecycle:detect", check: "openclaw:lifecycle:check" },
  gateway: { connect: "openclaw:gateway:connect", state: "openclaw:gateway:state" },
} as const
```

**约束**：

- 嵌套仅限一层，禁止 `channels.a.b.c`
- `ipc.ts` 和 `bridge.ts` 引用时必须写完整路径：`openclawChannels.gateway.connect`
- `channels.ts` 内对象键按字母 / 行长升序排列

### renderer API 命名（types.ts / bridge.ts）

- 与 channel 名保持一致原则，但允许为了可读性保留 `onXxx` 前缀。
- 例如 channel 为 `gateway.status`，对应订阅 API 仍可叫 `onGatewayStatus`；channel 为 `bridge.event`，对应 API 叫 `onEvent`。
- 避免 renderer 侧出现 `checkCompat` + `installBridge` 这类业务动词堆砌，优先改为 `check` + `install`。

### types.ts

```ts
export interface WindowBridge {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  /** 订阅最大化状态变化，返回取消订阅函数 */
  onMaximizedChange: (listener: (v: boolean) => void) => () => void
}
```

### ipc.ts

```ts
import { ipcMain } from "electron"
import { windowChannels } from "./channels"
import { getMainWindow } from "../../core/window"

export function setupWindow(): void {
  ipcMain.handle(windowChannels.minimize, () => {
    getMainWindow()?.minimize()
  })
  // ...
}
```

> 公开入口函数命名约定：`setup<Feature>()`（参考 `setupCSP` 既有命名）。
> 不要用 `register*` / `init*` 等其他动词，保持全项目一致。

### bridge.ts

```ts
import { ipcRenderer } from "electron"
import { windowChannels } from "./channels"
import type { WindowBridge } from "./types"

export const windowBridge: WindowBridge = {
  minimize: () => ipcRenderer.invoke(windowChannels.minimize),
  // ...
  onMaximizedChange(listener) {
    const handler = (_: unknown, v: boolean) => listener(v)
    ipcRenderer.on(windowChannels.maximizedChanged, handler)
    return () => ipcRenderer.off(windowChannels.maximizedChanged, handler)
  },
}
```

## 事件订阅模式

所有事件订阅 API **必须返回取消订阅函数**，由调用方在组件卸载时调用。**禁止**提供 `removeXxx` / `removeAllListeners` 这类暴力清理 API。

```ts
// ✅ 好：返回取消函数
onMaximizedChange(listener: (v: boolean) => void): () => void

// ❌ 坏：成对 API，清理粒度粗
onMaximizedChange(listener)
removeMaximizedChange()
```

## 添加新 feature 的步骤

1. `mkdir electron/<name>` 并创建上述 4-5 个文件（**不要**创建 `index.ts`）
2. 在 `electron/main.ts` 加 `import { setup<Name> } from "./<name>/ipc"` 并在 `whenReady` 中调用
3. 在 `electron/preload.ts` 加 `import { <name>Bridge } from "./<name>/bridge"`，并在 `api` 对象中加一个键
4. renderer 端立即可用 `window.electron.<name>.<method>`，类型自动出现

## 删除 feature 的步骤

1. `rm -rf electron/<name>`
2. 删 `main.ts` 和 `preload.ts` 中各一行 import + 一个 api 键
3. 全局搜 `window.electron.<name>` 清理 renderer 调用点
