# 命名规则

| 类型 | 规则 | 例子 |
|---|---|---|
| 文件名 | 小写 + 单个单词 | `service.ts` `bridge.ts` |
| 目录名 | 小写 + 单个单词 | `updater/` `deeplink/` |
| 函数名 | camelCase + 动词开头 | `createWindow` `checkUpdate` |
| 类型/接口 | PascalCase + 名词 | `UpdateInfo` `WindowBridge` |
| 常量 | UPPER_SNAKE_CASE | `CHECK_INTERVAL_MS` |
| Boolean | is/has/can/should 前缀 | `isDev` `hasUpdate` `canQuit` |
| 私有函数 | 不导出即可，无需 `_` 前缀 | — |
| Hook 文件 | `use-` 前缀 + kebab-case | `use-theme-effect.ts` `use-now.ts` |

> Hook 文件名是"小写单词"规则的**唯一例外**：React 社区惯例 `use-` 前缀必须保留，多单词时用连字符。Hook 函数本身仍然 camelCase（`useThemeEffect`）。

## 函数命名约束

- 动词开头（`checkUpdate` / `downloadFile`）
- 禁用万金油动词（`handle` / `process` / `do`）
- 一个函数只做一件事，函数名要能完整描述这件事

## React 组件文件

- **文件名**：小写 + 单词（不用 PascalCase 或 kebab-case）
  - ✅ `titlebar.tsx` `theme.tsx` `modal.tsx`
  - ❌ `TitleBar.tsx` `title-bar.tsx` `Modal/index.tsx`
- **目录名**：小写 + 单词
  - ✅ `update/` `layout/` `providers/`
  - ❌ `Update/` `update-modal/`
- **组件本身**：仍然 PascalCase（React 要求）
  - ✅ `export function TitleBar() { ... }`
- **样式文件**：与组件同名 + `.css`
  - ✅ `modal.tsx` + `modal.css`
- **同 feature 内 sibling 引用用相对路径**，跨 feature 用 `@/` 别名
  - ✅ `import Modal from "./modal"`（同目录）
  - ✅ `import { TitleBar } from "@/components/layout/titlebar"`（跨目录）

⚠️ `app/components/ui/` 是 shadcn CLI 生成的，**不在此规则范围内**，保持工具默认（kebab-case）。
