## Why

开物局项目从零开始，需要先搭建 Monorepo 骨架，让所有后续施工模块有统一的基础设施可依赖。这是整条施工链的第一步，没有它后面的数据库、API 层、展示网站都无从开始。

需求来源：`design/施工/00-项目初始化/README.md`

依赖的前置模块：无（第一个施工模块）

## What Changes

- 创建 Turborepo Monorepo 根配置（package.json、pnpm-workspace.yaml、turbo.json、tsconfig.base.json）
- 初始化 5 个 package 骨架：`@kaiwu/db`、`@kaiwu/domain`、`@kaiwu/ui`、`@kaiwu/openclaw`、`@kaiwu/templates`
- 初始化 `apps/site`（Next.js 16 + UnoCSS + shadcn/ui）
- 创建 CLAUDE.md 项目级指令文件
- 创建 `.claude/rules/` 下 6 个代码规范文件（ts、code-names、comments、style、pages、api）
- 创建 `.env.example` 环境变量模板
- 配置 `.gitignore`

## Capabilities

### New Capabilities

- `monorepo-skeleton`: Turborepo + pnpm workspace 根配置，各 package 的 package.json 和 tsconfig.json
- `site-app-init`: apps/site 的 Next.js 16 + UnoCSS 初始化，可启动的空应用
- `code-standards`: CLAUDE.md 项目指令 + .claude/rules/ 代码规范文件集

### Modified Capabilities

（无，全部为新建）

## Impact

- 新增根目录配置文件：package.json、pnpm-workspace.yaml、turbo.json、tsconfig.base.json、.env.example、.gitignore
- 新增 5 个 package 目录，每个含 package.json + tsconfig.json + src/index.ts
- 新增 apps/site 目录，含 Next.js 完整初始化
- 新增 CLAUDE.md + .claude/rules/ 下 6 个 .md 文件
- 依赖安装：turbo、typescript、oxlint、next、react、unocss、drizzle-orm 等
