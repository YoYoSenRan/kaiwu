## ADDED Requirements

### Requirement: Monorepo 根配置文件就位

项目根目录 SHALL 包含以下配置文件：
- `package.json`（name: "kaiwu"，private: true，scripts: dev/build/lint/typecheck）
- `pnpm-workspace.yaml`（packages: apps/* + packages/*）
- `turbo.json`（tasks: dev/build/typecheck/lint）
- `tsconfig.base.json`（strict: true，target: ES2022，module: ESNext，moduleResolution: bundler）

#### Scenario: pnpm install 成功
- **WHEN** 在项目根目录执行 `pnpm install`
- **THEN** 所有 workspace package 的依赖安装成功，无报错

#### Scenario: turbo 命令可用
- **WHEN** 执行 `pnpm typecheck`
- **THEN** Turborepo 按依赖拓扑顺序执行所有 package 的 typecheck，全部通过

### Requirement: 5 个 package 骨架就位

以下 package SHALL 存在且可被其他 package 引用：
- `packages/db`（name: @kaiwu/db）
- `packages/domain`（name: @kaiwu/domain，依赖 @kaiwu/db + @kaiwu/openclaw）
- `packages/ui`（name: @kaiwu/ui）
- `packages/openclaw`（name: @kaiwu/openclaw，依赖 @kaiwu/templates）
- `packages/templates`（name: @kaiwu/templates）

每个 package SHALL 包含：package.json、tsconfig.json（extends tsconfig.base.json）、src/index.ts。

#### Scenario: workspace 引用可解析
- **WHEN** apps/site 的 package.json 声明依赖 `@kaiwu/db`
- **THEN** TypeScript 可以解析 `import {} from "@kaiwu/db"` 且 typecheck 通过

#### Scenario: 空 package typecheck 通过
- **WHEN** 执行 `pnpm typecheck`
- **THEN** 所有 5 个 package 的 typecheck 均通过，无错误

### Requirement: 环境变量模板

项目根目录 SHALL 包含 `.env.example`，列出所有必需的环境变量（DATABASE_URL、OPENCLAW_*、GITHUB_*、NEXT_PUBLIC_SITE_URL）。

#### Scenario: 开发者知道需要哪些环境变量
- **WHEN** 新开发者 clone 项目
- **THEN** 可以通过 `cp .env.example .env` 获得完整的环境变量模板

### Requirement: .gitignore 配置

项目 SHALL 有 .gitignore 文件，排除 node_modules/、.next/、dist/、.env、.env.local、*.tsbuildinfo、.turbo/。

#### Scenario: 构建产物不被提交
- **WHEN** 执行 `pnpm build` 后运行 `git status`
- **THEN** .next/、dist/、.turbo/ 目录不出现在未跟踪文件列表中
