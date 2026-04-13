---
paths:
  - "electron/**/*.ts"
---

# 项目架构

## 顶层目录

```
electron/
├── main.ts                 # 主进程入口，只做装配
├── preload.ts              # 预加载入口，聚合 feature bridge
├── env.d.ts                # main 进程环境变量声明
├── core/                   # Electron 基础设施（不属于任何业务）
├── db/                     # 数据持久化层（SQLite，跨 feature 共用）
├── embedding/              # 嵌入引擎层（ML 推理，跨 feature 共用）
├── engine/                 # 对话执行引擎层（AI 编排策略）
├── knowledge/              # RAG 能力层（pipeline/chunker/parser/search/cache，跨 feature 共用）
├── openclaw/               # OpenClaw 集成大模块（独立子系统）
└── features/               # IPC 功能切片，每个功能一个目录
```

## core/

**Electron 基础设施层**。封装操作系统与 Electron API，不含任何业务语义。
所有层次都可以依赖 core，**core 绝不反向依赖任何上层**。

典型内容：

- `app.ts` — 应用生命周期、单实例锁
- `window.ts` — 窗口创建与单例管理（`createMainWindow` / `getMainWindow` / `clearMainWindow`）
- `paths.ts` — 路径常量
- `env.ts` — 环境/平台判断（isDev / isMac / isWin / isWin7）
- `security.ts` — CSP、权限等安全配置
- `logger.ts` — 日志实例初始化
- `store.ts` — 持久化存储实例（electron-store）
- `vector.ts` — 向量数据库连接管理（LanceDB）

## db/

**数据持久化层**。跨多个 feature 共用的 SQLite 访问，无 IPC。

- `schema.ts` — 表结构定义（Drizzle schema）
- `migrate.ts` — 数据库迁移（应用启动时执行）
- `client.ts` — 数据库连接单例
- `repositories/` — 各实体的 CRUD（agents / bindings / documents / knowledges）

**依赖规则**：
- features 可以 import db/；db 不反向依赖 features；db 不 import ipcMain

## embedding/

**嵌入引擎层**。ML 推理基础设施，被 knowledge pipeline 和 chat 等多个 feature 依赖，无 IPC。

- `engine.ts` — 引擎主入口，管理 local/remote provider 切换
- `local.ts` — 本地模型（ONNX Runtime）
- `remote.ts` — 远程 API（OpenAI-compatible endpoint）
- `models.ts` — 内置模型元数据
- `worker.ts` — Worker 线程包装（本地推理在独立线程运行）

**注意**：`features/embedding/` 是该引擎的 **IPC 配置层**（提供设置读写、模型下载的 bridge），
两者同名不同职责。选层规则：涉及 ML 推理逻辑 → `embedding/`；涉及 IPC bridge → `features/embedding/`。

**依赖规则**：features 可以 import embedding/；embedding 不反向依赖 features

## engine/

**对话执行引擎层**。AI 对话编排策略，被 chat/orchestrator 依赖，无 IPC。

- `types.ts` — 执行上下文类型
- `context.ts` — 对话上下文构建
- `runner.ts` — 单轮对话执行
- `strategy.ts` — 多 Agent 编排策略

**依赖规则**：features 可以 import engine/；engine 不反向依赖 features

## knowledge/

**RAG 能力层**。文档处理与向量检索的技术基础设施，被 `features/knowledge/` 的 IPC 业务层调用，无 IPC。

- `pipeline.ts` — 文档处理主流程：parse → chunk → embed → store
- `chunker.ts` — 递归字符分割算法
- `parser.ts` — 格式分发（按扩展名路由到 parsers/）
- `parsers/` — 各格式解析器（md / txt / pdf / docx / xlsx）
- `search.ts` — 向量检索（LanceDB query）
- `cache.ts` — 文档缓存文件管理（userData/knowledge-files/）

注意：`features/knowledge/` 是该能力的 **IPC 业务层**（知识库 CRUD、文档上传、绑定管理），两者职责不同。

**依赖规则**：features/knowledge 可 import knowledge/；knowledge 不反向依赖 features

## openclaw/

**OpenClaw 集成大模块**。独立子系统，有自己的分层，体量远超普通 feature。
通过顶层 `ipc.ts` + `bridge.ts` 与 main/preload 对接，行为上与 feature 相同。

内部分层：

- `core/` — 连接管理、生命周期、插件加载
- `gateway/` — WebSocket 协议、认证、RPC 调用
- `agent/` — Agent 管理 RPC 契约
- `hook/` — 主进程推送事件分发

**依赖规则**：openclaw 内部 core/ 不依赖 gateway/；openclaw 整体不依赖 features/

## features/

**IPC 功能切片**。每个功能一个目录，文件结构和职责见 `ipc.md`。

**约束**：

- feature 之间禁止互相 import
- 需要跨 feature 共用的无 IPC 能力 → 放入 db/ / embedding/ / engine/（视业务域）
- 需要 Electron 基础封装 → 放入 core/
- 不允许出现"半个 feature"散落在多个目录

## 依赖方向

```
core/  ←── 任何层都可以依赖
db/    ←── features / openclaw / knowledge 可以依赖
embedding/ ←── features / openclaw / engine / knowledge 可以依赖
engine/ ←── features 可以依赖
knowledge/ ←── features/knowledge 可以依赖

以上层次均不可反向依赖 features 或 openclaw
openclaw/ ←── 独立，不依赖任何 feature
features/ ←── 彼此禁止互相依赖
```

## 选层决策树

新增代码时，按以下顺序判断放哪里：

1. **Electron API 封装、无业务语义？** → `core/`
2. **SQLite 访问、跨 feature 共用、无 IPC？** → `db/`
3. **ML 推理（embedding 计算）、跨 feature 共用、无 IPC？** → `embedding/`
4. **文档处理（解析/分块/检索）、跨 feature 共用、无 IPC？** → `knowledge/`
5. **AI 对话编排策略、无 IPC？** → `engine/`
6. **OpenClaw 连接 / 协议细节？** → `openclaw/` 对应子目录
7. **有 IPC channel、有 bridge？** → `features/<name>/`
8. **实在不确定** → 问问：这段代码如果 feature X 不存在了，它还有存在的意义吗？  
   有意义 → 考虑 db/embedding/engine/knowledge；无意义 → 放进对应 feature

## 装配方式

- feature 通过 `setup<Name>()` 函数自注册
- `main.ts` 在 `app.whenReady` 之后统一调用所有 `setup*()`
- `preload.ts` 聚合各 feature 的 bridge 成 `const api`
- 通过 `contextBridge.exposeInMainWorld("electron", api)` 暴露
- renderer 统一通过 `window.electron.<feature>.<method>` 调用

## 主进程启动顺序

```ts
prepareApp() // 同步准备：禁用 GPU / setAppUserModelId
setupProtocol() // 自定义协议必须在 singleInstanceLock 之前
setupDeeplinkListeners() // open-url 必须在 whenReady 之前
if (!requestSingleInstance()) app.quit()
setupAppLifecycle() // window-all-closed / activate

app.whenReady().then(() => {
  setupCSP() // CSP 必须在创建窗口前
  setupAppMenu()
  runMigrations() // 必须在 setupAgent 之前（保证表已建）
  createMainWindow() // 先建窗口（setupChrome 需要绑定窗口事件）
  // 各 setup*() IPC handler 注册
  flushPendingDeepLink() // 处理冷启动暂存的 URL
})
```
