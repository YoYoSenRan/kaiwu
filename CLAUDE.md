# Kaiwu — Claude Code 项目规范

## 项目概览

Kaiwu 是一个以「一人公司制度化运转」为目标的多智能体协作系统，以中国古代三省六部制为骨架，以 OpenClaw 为群 Agent 协同底座。

**架构**：Turborepo Monorepo

- `apps/site` — 官网（Next.js App Router，Server Component 为主）
- `apps/console` — 管理后台（Next.js App Router，Client Component 为主）
- `packages/db` — 数据库层
- `packages/domain` — 业务领域模型
- `packages/ui` — 共享 UI 组件库

**技术栈**：Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Oxlint · Oxfmt · pnpm · Turborepo

## 常用命令

```bash
pnpm dev              # 启动所有应用（并行）
pnpm dev:console      # 仅启动 console
pnpm dev:site         # 仅启动 site
pnpm lint             # oxlint 检查
pnpm lint:fix         # 自动修复
pnpm format           # oxfmt 格式化
pnpm typecheck        # TypeScript 类型检查
pnpm build            # 全量构建
```

## 规范文件索引（按需引入）

@.claude/rules/ts.md
@.claude/rules/code-names.md
@.claude/rules/comments.md
@.claude/rules/style.md
@.claude/rules/pages.md
@.claude/rules/api.md
@.claude/rules/docs.md

## 代码模板（生成新页面时参照）

@.claude/code-design/page/README.md
@.claude/code-design/data-table/README.md
@.claude/code-design/form/README.md
@.claude/code-design/api-route/README.md

## 核心约束

1. **禁止 `any`**：用 `unknown` + 类型收窄代替
2. **必须用 `cn()`**：className 合并统一通过 `src/lib/utils.ts` 中的 `cn()`
3. **页面保持薄**：`page.tsx` < 80 行，只做数据获取+布局，业务逻辑下沉
4. **分页状态放 URL**：用 `searchParams` 驱动分页/筛选，不用 `useState + fetch`
5. **Server Action 优先**：数据变更优先用 Server Action，Route Handler 仅用于 Webhook/文件上传
6. **Zod 校验必须**：所有外部输入在 Server Action / Route Handler 入口处用 zod 校验
7. **最小修改**：只改当前任务涉及的代码，禁止顺手重构无关部分

## 工作流

- **复杂功能**（跨文件/新模块）→ 先执行 openspec propose，写清楚 Why 和 How，再编码
- **中等需求**（新增标准页面）→ 参照 `.claude/code-design/` 模板直接生成
- **简单改动**（文案/小逻辑）→ 直接执行，无需 spec
