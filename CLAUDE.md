# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```sh
pnpm dev          # 启动开发（vite + electron）
pnpm build        # tsc 类型检查 → vite build → electron-builder 打包
pnpm lint         # ESLint flat config 检查
pnpm lint:fix     # ESLint 自动修复
pnpm format       # Prettier 格式化
pnpm test         # 跑 e2e（pretest 会先 vite build --mode=test，必须经过它产出 dist/dist-electron）
```

跑单个测试（vitest + playwright e2e）：

```sh
pnpm pretest && pnpm exec vitest run test/e2e.spec.ts -t "startup"
```

注意：`test/` 下目前只有 `e2e.spec.ts`，会真实启动 Electron 应用。Linux 平台测试自动跳过。

## 详细规范（必读）

`.claude/rules/` 是项目所有约束的源头。**修改代码前先看对应的 rule 文件**：

| 文件              | 覆盖范围                                                                          |
| ----------------- | --------------------------------------------------------------------------------- |
| `architecture.md` | 主进程目录划分（core/ vs IPC 能力模块）、装配方式、启动顺序                       |
| `ipc.md`          | feature 4-5 文件模板（channels/types/service/ipc/bridge）、**禁止 barrel** 的原因 |
| `pages.md`        | 渲染进程目录结构、`pages/` 组织、上浮规则、私有组件放哪                           |
| `persistence.md`  | 双轨持久化：zustand persist（renderer）vs electron-store（main）的选择规则        |
| `i18n.md`         | 翻译键命名、什么要/不要翻译、locale 同步铁律                                      |
| `testing.md`      | E2E 优先策略、什么改动必须补测试、命名与清理规范                                  |
| `commit.md`       | Conventional Commits + 中文描述、type/scope 枚举、一次一件事                      |
| `imports.md`      | 单块 import、按行长升序、对象字面量键序                                           |
| `naming.md`       | 文件名小写单词、组件 PascalCase、动词函数名                                       |
| `comments.md`     | 导出函数 JSDoc 必写、行内注释解释"为什么"                                         |
| `quality.md`      | 函数 ≤ 40 行、文件 ≤ 200 行、嵌套 ≤ 3 层、魔法值入 constants                      |
| `principles.md`   | 高内聚低耦合、单一职责、关注点分离、依赖倒置、开闭原则、封装、正交性              |
| `design.md`       | UI 设计语言 "Operations Deck"（仅 `app/**/*.tsx` `app/**/*.css` 受约束）          |

## 架构鸟瞰

三个进程，目录隔离严格：

```
electron/                      主进程 + preload
├── main.ts                    入口，只做装配（启动顺序见 architecture.md）
├── preload.ts                 聚合 feature bridge → contextBridge.exposeInMainWorld("electron", api)
├── core/                      Electron 基础设施层（app/window/security/menu/store/logger/paths/env/vector）
├── db/                        数据持久化层（schema/migrate/client/repositories，跨 feature 共用）
├── engine/                    对话执行引擎层（AI 编排策略：runner/context/strategy）
├── openclaw/                  OpenClaw 集成大模块（独立子系统：core/gateway/agent/hook）
├── chrome/                    IPC 能力模块：窗口控制
├── deeplink/                  IPC 能力模块：深度链接与协议
├── knowledge/                 IPC 能力模块：知识库 CRUD
├── log/                       IPC 能力模块：日志通道
└── updater/                   IPC 能力模块：自动更新
    每个目录固定 4-5 个文件：channels.ts / types.ts / service.ts / ipc.ts / bridge.ts
app/                           渲染进程（React 19 + react-router HashRouter）
├── main.tsx / App.tsx
├── components/                业务组件 + ui/（shadcn 生成，kebab-case 例外）
├── hooks/                     副作用 hook（如 use-theme-effect）
├── stores/                    zustand store（settings 持久化、counter 临时）
├── i18n/                      i18next + react-i18next（zh-CN / en）
├── styles/                    全局 CSS / Tailwind v4 入口
└── utils/                     通用工具
```

### 装配铁律

- **依赖方向**：core ← db/engine ← IPC 能力模块；各技术层均不可反向依赖 IPC 能力模块；IPC 能力模块之间禁止互相 import。
- 需要跨模块共用的无 IPC 能力：SQLite CRUD → `db/`；AI 编排 → `engine/`；Electron 封装 → `core/`。
- IPC 能力模块 **不创建 `index.ts` barrel**：barrel 会让 rollup 沿 re-export 链把 `ipc.ts` / `service.ts` 拉进 preload bundle，导致 `node:path` 等主进程 API 进入 preload，preload 启动崩溃。`main.ts` 和 `preload.ts` 必须直接 import 具体文件（`./x/ipc` 或 `./x/bridge`）。
- IPC 能力模块通过 `setup<Name>()` 自注册，`main.ts` 在 `app.whenReady` 后统一调用。
- renderer 调用约定：`window.electron.<name>.<method>`（preload 在 `electron/preload.ts:21` 用 `exposeInMainWorld("electron", api)` 暴露，`window` 类型在 `app/types/window.d.ts`）。
- 启动顺序敏感：`prepareApp` → `setupProtocol` → `setupDeeplinkListeners` → `requestSingleInstance` → `setupAppLifecycle` → `whenReady` 内 `setupCSP` → `setupAppMenu` → `createMainWindow` → 各 `setup*()` IPC → `flushPendingDeepLink`。任何调整都要参照 `architecture.md` 的"主进程启动顺序"。

### 持久化双轨

- **zustand persist（renderer）**：theme/lang 等首帧即需的偏好，写在 `app/stores/settings.ts`；业务状态另起独立 store，禁止往 settings 塞业务数据。**禁止组件里直接用 `localStorage`**。
- **electron-store（main）**：窗口状态、凭证、跨进程共享数据。schema 在 `electron/core/store.ts` 强类型声明，默认值集中在 `defaults`。renderer 需要读时新建 `store/` IPC 能力模块走 bridge（暂未建）。
- 选不出来时按 `persistence.md` 的"模糊地带的判断"三问。

## 工程约定速查

- 路径别名：`@` → `app/`（见 `vite.config.ts`）。
- Auto import：`react` / `react-router` 由 `unplugin-auto-import` 自动注入，类型生成到 `app/types/auto-imports.d.ts`，无需手写 import。
- `dist-electron/` 每次 vite 启动会被 `rmSync` 清空（见 `vite.config.ts:12`），不要把任何手写文件放进去。
- shadcn 组件用 `pnpm dlx shadcn@latest add <name>`，落地到 `app/components/ui/`（这个目录是 shadcn 工具区，命名规则不受 `naming.md` 约束）。
- TS 严格模式 + ESLint flat config + prettier-plugin-tailwindcss；提交前跑 `pnpm lint`。
