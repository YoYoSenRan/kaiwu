---
paths:
  - "app/stores/**"
  - "app/**/*.tsx"
  - "electron/core/store.ts"
  - "electron/features/store/**"
---

# 本地持久化规范

项目有两套持久化方案，**必须按数据属性选对**，禁止混用或散落在组件里。

## 两套方案

| 方案 | 位置 | 进程 | 同步读取 | 适用场景 |
|---|---|---|---|---|
| **zustand persist** | `localStorage`（自动托管） | 渲染进程 | ✅ 同步 | UI state / 偏好 / "首帧即需"的状态 |
| **electron-store** | `<userData>/config.json` | 主进程 | ❌ 需 IPC | 系统状态、业务数据、敏感信息 |

### 为什么是 zustand persist 而不是手写 localStorage

1. **zustand 已经是项目的状态管理方案**（`app/stores/counter.ts` 在用）。持久化和 state 管理一体化比另起炉灶的 `lib/storage.ts` 更自然
2. **类型安全**：state 类型由 TS 自动推导，零样板
3. **跨组件共享**：React context 的功能 zustand 原生提供
4. **跨窗口同步**：zustand persist 内置 storage event 处理
5. **rehydration 是同步的**（默认用 `createJSONStorage(() => localStorage)`），首帧即可读到持久化值

## 选择规则

### 必须用 electron-store

| 数据 | 原因 |
|---|---|
| 窗口状态（bounds、全屏、置顶） | 主进程自己要读 |
| 用户凭证 / API key | localStorage 明文不安全，electron-store 支持加密 |
| 业务核心数据（最近项目、文件路径、收藏） | 用户需要备份/迁移 |
| 多进程共享状态 | localStorage 只在 renderer，main 读不到 |

### 必须用 zustand persist

| 数据 | 原因 |
|---|---|
| theme / lang | 首帧要读，避免闪烁 |
| UI 偏好（侧栏折叠、列表排序、视图模式） | 同上 |
| 搜索历史、表单草稿 | 只 renderer 用，不敏感 |
| 需要跨组件共享的本地 state | zustand 天然支持 |

### 模糊地带的判断

不确定时问自己三个问题：

1. **主进程需要读吗？** → 是，选 electron-store
2. **首次渲染就要用吗？** → 是，选 zustand persist
3. **有隐私/安全风险吗？** → 是，选 electron-store（加密）

三个问题有两个"是"走 electron-store，否则 zustand persist。

## 铁律

### zustand persist（renderer 端）

1. **禁止组件里直接调 `localStorage`**：所有 renderer 端持久化必须通过 zustand store，不允许 `localStorage.getItem("xxx")` 或 `localStorage.setItem("xxx", ...)` 出现在组件或 hook 中
2. **store 分域**：
   - **settings**（`app/stores/settings.ts`）：theme / lang 等"应用级偏好"
   - **业务 store**：每个业务模块一个 store（比如 `stores/search-history.ts`、`stores/editor-draft.ts`），禁止往 settings 塞业务数据
3. **每个 persist store 的 name 必须唯一**：`persist(..., { name: "settings" })` 里的 `name` 是 localStorage key，不同 store 用不同 name 避免冲突
4. **带 version + migrate**：非 trivial 的 schema 改动必须加版本号和 migration 函数（见下方示例）
5. **副作用用 hook 包装**：像 theme 的 "apply class to root"、"监听系统主题"、"D 键快捷键" 这类副作用，放在专门的 `use-xxx-effect.ts` hook 里，在 App 顶层调用一次

### electron-store（main 端）

1. **Schema 强类型**：所有 key 必须在 `StoreSchema`（`electron/core/store.ts`）中声明类型
2. **通过 IPC 桥接访问**：renderer 通过 `features/store/` 的 bridge 访问（暂未实现，第一次需要时再建 feature）
3. **默认值集中定义**：`new Store({ defaults: { ... } })`，禁止 `store.get(key, fallback)` 散落 fallback

## 添加新持久化字段的步骤

### 情况 A：应用级偏好（theme / lang / 侧栏折叠等）

**加到 `app/stores/settings.ts`**：

```ts
interface SettingsState {
  theme: "light" | "dark" | "system"
  lang: "zh-CN" | "en"
  sidebarCollapsed: boolean          // ← 新增
  setTheme: (theme: ...) => void
  setLang: (lang: ...) => void
  setSidebarCollapsed: (v: boolean) => void  // ← 新增
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      lang: "zh-CN",
      sidebarCollapsed: false,       // ← 新增默认值
      setTheme: ...,
      setLang: ...,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),  // ← 新增 setter
    }),
    { name: "settings", version: 1 },
  ),
)
```

**组件里直接用**：`const collapsed = useSettingsStore((s) => s.sidebarCollapsed)`

### 情况 B：独立业务 store（搜索历史 / 最近使用等）

**新建 `app/stores/<name>.ts`**：

```ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SearchHistoryState {
  items: string[]
  push: (q: string) => void
  clear: () => void
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      items: [],
      push: (q) => set((s) => ({ items: [q, ...s.items.filter((x) => x !== q)].slice(0, 20) })),
      clear: () => set({ items: [] }),
    }),
    { name: "search-history", version: 1 },
  ),
)
```

注意 `name` 必须和其他 store 不同，避免 localStorage key 冲突。

### 情况 C：electron-store（需要时再做）

1. 编辑 `electron/core/store.ts`：`StoreSchema` 加字段、`defaults` 加默认值
2. 如果 renderer 要读：建 `features/store/` feature（channels + types + ipc + bridge），挂到 `window.electron.store`
3. renderer 通过 `await window.electron.store.get("xxx")` 异步读取

## Schema 迁移示例

当 persist 的 state 结构变化（字段重命名、类型修改），必须加版本号和 migration：

```ts
persist(
  (set) => ({ ... }),
  {
    name: "settings",
    version: 2,  // 从 1 升到 2
    migrate: (persisted: unknown, version: number) => {
      if (version === 1) {
        // v1 的 `language` 字段重命名为 `lang`
        const old = persisted as { language?: string }
        return { lang: old.language ?? "zh-CN", theme: "system" }
      }
      return persisted as SettingsState
    },
  },
)
```

## 反模式（一律禁止）

| 反模式 | 原因 |
|---|---|
| 组件里 `localStorage.getItem("theme")` | 绕过 store，失去类型约束和跨组件同步 |
| 新建 `lib/storage.ts` 再自己包一层 | 项目有 zustand，不要重复造轮子 |
| 往 `settings` store 塞业务数据（收藏列表、搜索历史） | settings 只放应用级偏好，业务数据另起 store |
| 多个 store 用同一个 `persist name` | localStorage key 冲突，互相覆盖 |
| 在 store 外部直接调 `localStorage.setItem("settings", ...)` 绕过 zustand | 会让 store 内存状态和持久化状态不同步 |
| `localStorage.setItem("token", ...)` | 凭证/密钥必须走主进程的 electron-store 加密存储 |
| 在 localStorage 和 electron-store 之间手动同步 | 同一份数据两处存必然不一致 |
