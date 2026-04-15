# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
pnpm dev             # Vite + Electron 一体化开发启动
pnpm build           # tsc → vite build → electron-builder 打包
pnpm test            # E2E (pretest 会先做 vite build --mode=test)
pnpm lint:check      # ESLint 纯检查
pnpm lint            # ESLint + autofix
pnpm format          # Prettier
pnpm plugin:dev      # 监听并同步 plugins/kaiwu 到 OpenClaw extensions
pnpm plugin:sync     # 单次同步
pnpm plugin:check    # 检查同步状态
pnpm db:generate     # Drizzle 迁移生成
```

### 单用例 E2E

```bash
pnpm pretest && pnpm exec vitest run test/e2e.spec.ts -t "startup"
```

**跑 E2E 前必须停掉 `pnpm dev`** —— 主进程有单实例锁，dev 正在跑时测试进程会被立刻退出，表面上只看到 `exitCode=0` 看不出真相。

## 项目架构（跨文件的"大图"）

### 进程分层

```
electron/              主进程
├── main.ts            12 行，仅做 bootstrap + 顶层错误兜底
├── framework/         基础设施（无业务）：AppModule / Phase / IpcController / 装饰器 / 注册中心
├── infra/             技术底座：logger / env / paths / security / store / vector
├── app/               应用编排：bootstrap · context · modules 清单 · 主窗口 · 菜单 · ipc 模块
├── platform/          OS 能力（带 IPC）：chrome/clipboard/deeplink/dialog/…/updater
├── features/          业务能力（带 IPC）：openclaw · knowledge
├── shell/             副 OS 表面（无 IPC）：tray · shortcuts
└── preload.ts         汇总所有 bridge，contextBridge 暴露到 renderer

app/                   渲染进程（React + Vite）
```

### 启动编排：AppModule + Phase

所有启动单元实现 `AppModule`，按 `Phase` 分组串行执行：

| Phase | 时机 | 典型模块 |
|---|---|---|
| Starting | whenReady 之前 | platform-prep / single-instance / deeplink-setup / app-lifecycle |
| Ready | whenReady 之后 | csp / menu / main-window / tray / shortcuts |
| AfterWindowOpen | 主窗口创建后 | ipc / deeplink-flush |
| Eventually | 应用进入稳态 | —— |

- `app/bootstrap.ts` 是编排器，按 phase 推进 `Lifecycle`，反向 dispose 做关停
- `app/modules.ts` 是启动单元清单，同一 phase 内按数组顺序执行
- 应用关停：2s graceful + 3s 强制退出兜底（`before-quit` / `SIGINT` / `SIGTERM`）

### IPC 框架：`@Controller` + `@Handle` / `@On`

每个 platform/feature 三件套：`service.ts`（Controller）+ `bridge.ts`（preload）+ `types.ts`（共享）。

**主进程侧**：
```ts
@Controller("chrome")
export class ChromeService extends IpcController<ChromeEvents> implements IpcLifecycle {
  onReady() { /* 副作用初始化 */ }

  @Handle("window:minimize") minimize() { this.ctx.mainWindow.get()?.minimize() }

  onShutdown() { /* 释放资源 */ }
}
```

**preload 侧**：
```ts
const bridge = createBridge<ChromeEvents>("chrome")
export const chromeBridge: ChromeBridge = {
  minimize: () => bridge.invoke("window:minimize"),
  onChange: (listener) => bridge.on("window:change", listener),
}
```

关键约定：

- **Controller 零构造器** —— 用字段初始化或 `onReady()` 做副作用，不要写 `constructor`。`ctx`（含主窗口、lifecycle）由基类注入
- **Events 泛型两端共享类型** —— `IpcController<Events>` 和 `createBridge<Events>` 用同一个 `Events` 接口，channel 拼写 + payload 类型跨进程端到端校验
- **channel 命名用冒号分层**：`window:minimize` / `plugin:install` / `chat:send` 等
- **IPC 注册在 AfterWindowOpen phase**，所有 Controller 由 `IpcRegistry.register(ctx, controllers)` 统一注入 ctx
- **推送事件**：Controller 通过 `this.emit(channel, payload)` 推送，`@Controller` 装饰器会在 prototype 上安装 emit

### OpenClaw 插件桥接

OpenClaw 是独立运行时，kaiwu 和它通过 WebSocket gateway 通讯 + 文件系统同步插件源码：

- `features/openclaw/service.ts` —— IPC 门面，组合 `push + gateway + runtime` 三个协作者
  - `OpenclawEmitter` (`push.ts`) —— 事件推送门面，包 this.emit
  - `GatewayRuntime` (`core/connection.ts`) —— owns WS socket/caller/emitter/state，扫描 + 手动两种连接模式
  - `OpenclawRuntime` (`core/runtime.ts`) —— owns 本地 bridge WS server pluginServer，负责 install/uninstall/detect/invoke
- `plugins/kaiwu/` —— kaiwu 作为 OpenClaw extension 的插件源码，通过 `pnpm plugin:sync` 同步到 OpenClaw 的 extensions 目录
- `scripts/plugin-dev.mjs` —— 监听插件源码变化自动同步的开发脚手架

### 持久化（两套，按数据属性选）

- **zustand persist**（`app/stores/*`）—— UI state / 偏好 / 首帧即需的状态（localStorage）
- **electron-store**（`infra/store.ts`）—— 窗口状态 / 凭证 / 多进程共享数据（`<userData>/config.json`）

详细选择规则和反模式见 `.claude/rules/persistence.md`。

## 项目规则（必读）

`.claude/rules/` 下有细化规则，写代码前必看：

| 文件 | 作用域 |
|---|---|
| `quality.md` | 代码规模 / 命名 / import / 注释 / 封装 / 错误处理 等通用规则 |
| `pages.md` | `app/` 渲染进程目录结构、页面组织、页间解耦、上浮规则 |
| `persistence.md` | zustand persist vs electron-store 的选择规则 |
| `i18n.md` | 翻译键命名、locale 文件同步、切换语言的唯一路径 |
| `testing.md` | E2E 策略、vitest + playwright 混用的 matcher 陷阱、测试命名 |

## 开发注意事项

### TypeScript 装饰器

项目用 `experimentalDecorators: true`。**LSP（Volar / TS Server）偶尔会对装饰器报 `decorator with 2 arguments, but the decorator expects 3` 的缓存幽灵**，`tsc --noEmit` 命令行始终正常。IDE 里看到这类错报时直接 `TypeScript: Restart TS Server` 解决，不要改代码。

### Electron + Node 版本

Electron 41 自带 Node 22，因此主进程可以用 `import.meta.dirname`、Fetch、AbortController 等新 API。ESM + TS 模式下，CJS 包（如 `electron-updater`）需要 `createRequire(import.meta.url)` 加载。

### 日志

- 主进程用 `scope("name")` 拿 scoped logger：`import { scope } from "../infra/logger"`
- Dev 模式写入 `logs/dev.log`（512KB 上限，AI 读取友好）；生产写 userData 目录（5MB）
- 渲染进程通过 `window.electron.log.info(...)` 走 IPC 转发到主进程的 electron-log

### 新增 feature 的骨架

1. 在 `electron/features/<name>/` 建 `service.ts` + `bridge.ts` + `types.ts`
2. `service.ts` 写 `@Controller("<name>")` Controller，继承 `IpcController<Events>`
3. `bridge.ts` 用 `createBridge<Events>("<name>")` + 具名方法对象
4. `app/ipc.ts` 的 `IpcRegistry.register` 清单里加上 `<Name>Service`
5. `preload.ts` 的 `api` 对象里加上 `<name>: <name>Bridge`
6. renderer 通过 `window.electron.<name>.xxx()` 调用
7. E2E 必须补至少一条主路径覆盖（`.claude/rules/testing.md`）
