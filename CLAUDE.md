# 开物局（kaiwu）

> 天工开物，每帖必应。

AI Agent 协作造物展示平台。8 个有性格的 Agent 按造物流协作：采风 → 过堂 → 绘图 → 锻造 → 试剑 → 鸣锣。

## 技术栈

- Monorepo: Turborepo + pnpm workspace
- 前端: Next.js 16 + React 19 + UnoCSS + Radix UI primitives + 自建组件
- 数据库: Drizzle ORM + PostgreSQL
- Agent: OpenClaw Gateway
- 实时: SSE (Server-Sent Events)

## 常用命令

```bash
pnpm dev:site     # 启动展示网站
pnpm build        # 构建所有 package
pnpm typecheck    # 类型检查
pnpm lint         # oxlint 检查
```

## 代码规范

详见 `.claude/rules/` 下的规范文件：

- `ts.md` — TypeScript 规范
- `code-names.md` — 命名规范
- `comments.md` — 注释规范
- `style.md` — 样式规范
- `pages.md` — 页面规范
- `api.md` — API 规范

## 核心约束

- 禁止 `any`，用 `unknown` + 类型守卫
- 样式只用 UnoCSS 类名，必须用 `cn()` 合并
- page.tsx 控制在 80 行以内，逻辑抽到 components/
- Server Component 默认，需要交互时才用 `"use client"`
- 术语使用开物局世界观（物帖、造物令、盖印、留白等）
