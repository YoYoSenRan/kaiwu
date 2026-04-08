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
├── core/                   # 全局基础设施（不属于任何业务）
└── features/               # 业务功能切片，每个功能一个目录
```

## core/

基础设施层。所有 feature 都可以依赖 core，**core 绝不反向依赖 features**。

典型内容：

- `app.ts` — 应用生命周期、单实例锁
- `window.ts` — 窗口创建与单例管理（`createMainWindow` / `getMainWindow` / `clearMainWindow`）
- `paths.ts` — 路径常量
- `env.ts` — 环境/平台判断（isDev / isMac / isWin / isWin7）
- `security.ts` — CSP、权限等安全配置
- `logger.ts` — 日志实例初始化
- `store.ts` — 持久化存储实例

## features/

业务功能切片。每个功能一个目录，文件结构和职责见 `ipc.md`。

**约束**：

- feature 之间禁止互相 import
- 需要共享能力时下沉到 `core/`
- 不允许出现"半个 feature"散落在多个目录

## 装配方式

- feature 通过 `setup<Name>()` 函数自注册
- `main.ts` 在 `app.whenReady` 之后统一调用所有 `setup*()`
- `preload.ts` 聚合各 feature 的 bridge 成 `const api`
- 通过 `contextBridge.exposeInMainWorld("api", api)` 暴露
- renderer 统一通过 `window.api.<feature>.<method>` 调用

## 主进程启动顺序

```ts
prepareApp()                    // 同步准备：禁用 GPU / setAppUserModelId
setupProtocol()                 // 自定义协议必须在 singleInstanceLock 之前
setupDeeplinkListeners()        // open-url 必须在 whenReady 之前
if (!requestSingleInstance()) app.quit()
setupAppLifecycle()             // window-all-closed / activate

app.whenReady().then(() => {
  setupCSP()                    // CSP 必须在创建窗口前
  createMainWindow()            // 先建窗口
  setupWindow()                 // 后注册 IPC（部分 IPC 需要绑定窗口事件）
  setupUpdater()
  setupLog()
  flushPendingDeepLink()        // 处理冷启动暂存的 URL
})
```
