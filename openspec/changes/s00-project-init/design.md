## Context

开物局项目目前只有 design/ 目录下的设计文档和 openspec/ 配置，没有任何可运行的代码。需要从零搭建 Monorepo 骨架，为后续 14 个施工模块提供统一的基础设施。

目录结构、技术栈选型、模块划分已在 `design/技术架构.md → 模块划分` 中确定，本阶段严格按其执行。

## Goals / Non-Goals

**Goals:**

- 所有 package 可互相引用（`@kaiwu/db`、`@kaiwu/domain`、`@kaiwu/ui`、`@kaiwu/openclaw`、`@kaiwu/templates`）
- apps/site 可启动（`pnpm dev:site`）
- lint / typecheck 可运行
- 代码规范文件就位，后续开发有据可依
- 环境变量模板就位

**Non-Goals:**

- 不实现任何业务逻辑（数据库 schema、API、页面内容等属于后续模块）
- 不配置 CI/CD（属于后续打磨阶段）
- 不安装业务依赖（如 drizzle-orm 的具体 driver，留给 01-数据库模块）
- 不创建 apps/console（管理后台暂不开发，只建空目录占位）

## Decisions

### D1: 包管理器 — pnpm

设计文档指定 pnpm workspace。pnpm 的硬链接机制节省磁盘，strict 模式防止幽灵依赖，与 Turborepo 配合成熟。

### D2: 构建编排 — Turborepo

设计文档指定。任务缓存 + 依赖拓扑排序，`turbo dev` / `turbo build` / `turbo typecheck` 覆盖日常开发。

### D3: CSS 方案 — UnoCSS + shadcn/ui

设计文档指定 UnoCSS（preset-wind 兼容 Tailwind 类名）。shadcn/ui 提供基础组件，按需复制到项目中，不引入运行时依赖。

注意：shadcn/ui 默认使用 Tailwind CSS，需要配置适配 UnoCSS。具体做法：shadcn/ui 组件的类名本身是 Tailwind 兼容的，UnoCSS preset-wind 可以直接解析。

### D4: Lint — oxlint（不用 ESLint）

设计文档指定 oxlint + oxfmt。oxlint 是 Rust 实现的 linter，速度快，零配置即可覆盖常见规则。不引入 ESLint 避免配置复杂度。

### D5: 各 package 只建骨架

每个 package 只创建 package.json、tsconfig.json、src/index.ts（空 barrel 导出）。具体实现留给对应的施工模块。这样 typecheck 能跑通，workspace 引用能解析。

### D6: Next.js 版本 — 16

设计文档指定 Next.js 16 + React 19。使用 App Router。

## Risks / Trade-offs

- **UnoCSS + shadcn/ui 兼容性**：shadcn/ui 的 CSS 变量命名和 UnoCSS 的 theme 配置需要手动对齐。→ 在 globals.css 中定义 CSS 变量，UnoCSS 通过 theme 引用。
- **oxlint 规则覆盖度**：oxlint 规则不如 ESLint 生态丰富。→ 对于本项目够用，后续如有需要可补充。
- **空 package 的 typecheck**：空的 src/index.ts 可能导致 tsc 报 "no inputs" 警告。→ 确保每个 index.ts 至少有一行导出（`export {}`）。
