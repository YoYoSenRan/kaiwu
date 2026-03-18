## 1. 根配置文件

- [x] 1.1 创建 `package.json`（name: kaiwu, private: true, scripts: dev/build/lint/format/typecheck）— 验收：文件存在且 JSON 合法
- [x] 1.2 创建 `pnpm-workspace.yaml`（packages: apps/* + packages/*）— 验收：pnpm 识别所有 workspace
- [x] 1.3 创建 `turbo.json`（tasks: dev/build/typecheck/lint）— 验收：`pnpm turbo --dry` 无报错
- [x] 1.4 创建 `tsconfig.base.json`（strict, ES2022, bundler resolution）— 验收：各 package 可 extends

## 2. Package 骨架

- [x] 2.1 创建 `packages/db/`（package.json: @kaiwu/db + tsconfig.json + src/index.ts）— 验收：typecheck 通过
- [x] 2.2 创建 `packages/domain/`（package.json: @kaiwu/domain, 依赖 @kaiwu/db + @kaiwu/openclaw + tsconfig.json + src/index.ts）— 验收：typecheck 通过
- [x] 2.3 创建 `packages/ui/`（package.json: @kaiwu/ui + tsconfig.json + src/index.ts）— 验收：typecheck 通过
- [x] 2.4 创建 `packages/openclaw/`（package.json: @kaiwu/openclaw, 依赖 @kaiwu/templates + tsconfig.json + src/index.ts）— 验收：typecheck 通过
- [x] 2.5 创建 `packages/templates/`（package.json: @kaiwu/templates + tsconfig.json + src/index.ts）— 验收：typecheck 通过
- [x] 2.6 创建 `apps/console/` 占位目录（空 package.json + README 说明暂不开发）— 验收：目录存在

## 3. apps/site 初始化

- [x] 3.1 初始化 Next.js 16 应用（`apps/site/`，App Router + TypeScript + src 目录）— 验收：`pnpm dev:site` 可启动
- [x] 3.2 安装并配置 UnoCSS（`apps/site/uno.config.ts` + preset-wind）— 验收：Tailwind 类名在页面上生效
- [x] 3.3 初始化 shadcn/ui（`apps/site/components.json` + `src/lib/utils.ts` 的 cn()）— 验收：`npx shadcn@latest add button` 可执行
- [x] 3.4 配置 workspace 依赖引用（package.json 中添加 @kaiwu/db 等）— 验收：`import {} from "@kaiwu/db"` typecheck 通过

## 4. 代码规范

- [x] 4.1 创建 `CLAUDE.md`（项目概览、技术栈、常用命令、规范索引、核心约束）— 验收：文件存在且内容完整
- [x] 4.2 创建 `.claude/rules/ts.md`（TypeScript 规范）— 验收：文件存在且内容非空
- [x] 4.3 创建 `.claude/rules/code-names.md`（命名规范）— 验收：文件存在且内容非空
- [x] 4.4 创建 `.claude/rules/comments.md`（注释规范）— 验收：文件存在且内容非空
- [x] 4.5 创建 `.claude/rules/style.md`（样式规范）— 验收：文件存在且内容非空
- [x] 4.6 创建 `.claude/rules/pages.md`（页面规范）— 验收：文件存在且内容非空
- [x] 4.7 创建 `.claude/rules/api.md`（API 规范）— 验收：文件存在且内容非空

## 5. 环境与 Git

- [x] 5.1 创建 `.env.example`（DATABASE_URL, OPENCLAW_*, GITHUB_*, NEXT_PUBLIC_SITE_URL）— 验收：文件存在且包含所有必需变量
- [x] 5.2 创建/更新 `.gitignore`（node_modules, .next, dist, .env, .turbo, *.tsbuildinfo）— 验收：构建产物不被 git 跟踪

## 6. 验证

- [x] 6.1 执行 `pnpm install` 无报错
- [x] 6.2 执行 `pnpm typecheck` 所有 package 通过
- [x] 6.3 执行 `pnpm dev:site` 浏览器可访问 localhost:3600
- [x] 6.4 执行 `pnpm lint` 通过
