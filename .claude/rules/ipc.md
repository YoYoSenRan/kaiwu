---
paths:
  - "electron/**/*.ts"
---

# IPC 设计模板

## 文件结构

每个 feature 在 `electron/features/<name>/` 下固定 4-5 个文件：

```
features/<name>/
├── channels.ts     # IPC channel 常量（as const）
├── types.ts        # 类型定义（包括 Bridge 接口）
├── service.ts      # 业务逻辑，可选，复杂 feature 才拆
├── ipc.ts          # ipcMain.handle 注册，供 main.ts 调用
└── bridge.ts       # preload 暴露给 renderer 的 API
```

**没有 `index.ts` barrel**。原因见下方"禁止 barrel"小节。

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
import { setupWindow } from "./features/window/ipc"
import { setupUpdater } from "./features/updater/ipc"
import { setupProtocol, flushPendingDeepLink } from "./features/deeplink/service"

// electron/preload.ts — 从 bridge.ts 直接导入
import { windowBridge } from "./features/window/bridge"
import { updaterBridge } from "./features/updater/bridge"
import { deeplinkBridge } from "./features/deeplink/bridge"
```

这样 rollup 的依赖图在 `bridge.ts` 处自然截断，不会误拉主进程代码。

## 模板代码

### channels.ts

```ts
export const windowChannels = {
  minimize: "window:minimize",
  maximize: "window:maximize",
  close: "window:close",
  isMaximized: "window:is-maximized",
  maximizedChanged: "window:maximized-changed",  // main → renderer
} as const
```

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

1. `mkdir electron/features/<name>` 并创建上述 4-5 个文件（**不要**创建 `index.ts`）
2. 在 `electron/main.ts` 加 `import { setup<Name> } from "./features/<name>/ipc"` 并在 `whenReady` 中调用
3. 在 `electron/preload.ts` 加 `import { <name>Bridge } from "./features/<name>/bridge"`，并在 `api` 对象中加一个键
4. renderer 端立即可用 `window.api.<name>.<method>`，类型自动出现

## 删除 feature 的步骤

1. `rm -rf electron/features/<name>`
2. 删 `main.ts` 和 `preload.ts` 中各一行 import + 一个 api 键
3. 全局搜 `window.api.<name>` 清理 renderer 调用点
