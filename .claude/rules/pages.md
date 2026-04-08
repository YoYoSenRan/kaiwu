---
paths:
  - "app/**/*.tsx"
  - "app/**/*.ts"
---

# 前端目录与页面结构

`electron/` 那半边由 `architecture.md` / `ipc.md` 管。这份只管 `app/`（渲染进程）。

## 顶层目录

```
app/
├── main.tsx                # 入口：i18n + theme 首帧 apply + 挂载 <App />
├── App.tsx                 # 路由壳：TitleBar + <Routes>，不写业务
├── pages/                  # 路由页面，一个路由一个目录
├── components/             # 跨页复用组件 + ui/（shadcn）
├── hooks/                  # 跨页复用的副作用 hook
├── stores/                 # zustand store（详见 persistence.md）
├── i18n/                   # 翻译（详见 i18n.md）
├── lib/                    # 通用工具函数（无 React 依赖）
├── styles/                 # 全部全局样式（分层：index.css 入口 → tokens.css 变量 → base.css 元素 reset → app.css 自定义 class）
└── types/                  # 全局类型 + auto-imports.d.ts
```

**铁律**：

- `App.tsx` 只做"挂 TitleBar + 装配路由"，不写业务、不写数据
- `pages/` 之间禁止互相 import；要共用就上浮到 `components/` `hooks/` `lib/` `stores/`
- `lib/` 里禁止 import React/组件，只放纯函数
- `components/ui/` 是 shadcn 工具区，命名规则不受约束（见 `naming.md`）

## pages/ 组织

**一个路由 = 一个目录**，目录名小写单词，入口固定叫 `index.tsx` 并 default export。

### 简单页面（< 200 行 + 子组件 ≤ 2 个）

单文件即可，不开子目录：

```
pages/
└── about/
    └── index.tsx
```

### 复杂页面（多 section / 多状态 / 私有数据）

开 `components/` `hooks/` `data.ts` 三件套，`index.tsx` 只做组装：

```
pages/
└── demo/
    ├── index.tsx           # 组装 + 路由级状态，default export
    ├── data.ts             # 静态数据 / 常量
    ├── hooks/
    │   └── use-now.ts      # 页面私有 hook
    └── components/         # 页面私有组件
        ├── header.tsx
        ├── hero.tsx
        ├── stats.tsx
        ├── activity.tsx
        └── services.tsx
```

### 路由注册

`App.tsx` 里只 import 页面入口，不 import 页面内部文件：

```tsx
// ✅ 正确
import Demo from "@/pages/demo"        // 走目录解析到 index.tsx
import Settings from "@/pages/settings"

<Routes>
  <Route path="/" element={<Demo />} />
  <Route path="/settings" element={<Settings />} />
</Routes>

// ❌ 错误：路由层不该知道页面内部结构
import Hero from "@/pages/demo/components/hero"
```

## 上浮规则（什么时候从 page 迁到全局）

页面私有的东西**只有真正被复用时才上浮**，避免一上来就过度抽象。

| 场景 | 处理 |
|---|---|
| 组件只在当前页面用 | `pages/<name>/components/` |
| 组件被 ≥2 个页面用 | 上浮到 `app/components/<分类>/` |
| Hook 只在当前页面用 | `pages/<name>/hooks/` |
| Hook 被 ≥2 个页面用 | 上浮到 `app/hooks/` |
| 工具函数（无 React） | 直接放 `app/lib/`，不进 page 私有目录 |
| 静态数据/常量 | 当前页用就 `pages/<name>/data.ts`；多页用进 `app/lib/constants.ts` |

## Import 规则（页面内部）

1. **同目录 sibling 用相对路径**：`import Hero from "./hero"`
2. **页面内部跨子目录用相对路径**：`import { useNow } from "../hooks/use-now"`
3. **跨页面或引用全局**：用 `@/` 别名
4. **禁止 barrel**：不在 `pages/<name>/` 或其子目录创建 `index.ts` 聚合导出（`index.tsx` 是页面本体，不是桶）。子组件直接从文件 import
5. 其他规则继承 `imports.md`（单块、按行长升序、side-effect 顶部）

```tsx
// ✅ pages/demo/index.tsx
import Hero from "./components/hero"
import Stats from "./components/stats"
import { useNow } from "./hooks/use-now"
import { STATS } from "./data"

// ❌ 不要写 pages/demo/components/index.ts 然后这样：
import { Hero, Stats } from "./components"
```

## 命名补充（继承 `naming.md`）

- 页面目录：小写单词（`demo` / `settings` / `about`）
- 页面入口：固定 `index.tsx`
- 私有组件：小写单词（`header.tsx` / `hero.tsx`），组件本身仍 PascalCase
- 私有 hook：`use-` 前缀 + kebab-case（`use-now.ts`），与 `app/hooks/` 一致
- 数据/常量：`data.ts` / `constants.ts`

## 反模式

| 反模式 | 原因 |
|---|---|
| 在 `App.tsx` 里写业务逻辑 | 它只是路由壳 |
| `pages/foo/` import `pages/bar/*` | 页面之间应通过全局组件/store 解耦 |
| 一上来就把所有子组件塞进 `app/components/` | 私有组件应留在 page 内，被复用了再上浮 |
| 在 page 子目录建 `index.ts` barrel | 同 `ipc.md`：徒增 import 链且没收益 |
| 页面 < 100 行还硬开 `components/` 子目录 | 过度组织，单文件就行 |
| `lib/` 里 import React 或组件 | `lib/` 必须保持纯函数无 React 依赖 |
| `pages/<name>/` 下放 `xxx.css` 全局样式 | 全局样式只放 `app/styles/`；页面私有样式可以同名 `hero.css` 紧贴组件 |
