# 00 — 项目初始化

## 目标

搭建 Turborepo Monorepo 骨架，配置技术栈、代码规范、目录结构。完成后所有 package 可以互相引用，lint/format/typecheck 可运行。

## 依赖

- 无（第一个施工模块）

## 项目根目录结构

```
kaiwu/
├── .claude/                         # Claude Code 配置（已有）
│   ├── commands/
│   ├── skills/
│   └── rules/                       # 代码规范规则（新建）
│       ├── ts.md
│       ├── code-names.md
│       ├── comments.md
│       ├── style.md
│       ├── pages.md
│       ├── api.md
│       └── docs.md
├── .codex/                          # Codex 配置（已有）
├── openspec/                        # OpenSpec 配置（已有）
├── design/                          # 设计文档（已有）
│
├── apps/
│   ├── site/                        # 展示网站（Next.js 16）
│   │   ├── src/
│   │   │   ├── app/                 # App Router 路由
│   │   │   ├── components/          # 组件
│   │   │   │   ├── layout/          # 布局组件（Navbar、Footer）
│   │   │   │   ├── ui/              # shadcn/ui 基础组件
│   │   │   │   └── features/        # 业务组件（按功能分）
│   │   │   ├── lib/                 # 工具函数、hooks
│   │   │   │   ├── utils.ts         # cn() 等
│   │   │   │   ├── fonts.ts         # 字体配置
│   │   │   │   └── hooks/           # 自定义 hooks
│   │   │   └── styles/              # 全局样式
│   │   ├── public/                  # 静态资源
│   │   ├── next.config.ts
│   │   ├── uno.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── console/                     # 管理后台（暂不开发，只建空目录）
│
├── packages/
│   ├── db/                          # 数据库层
│   │   ├── src/
│   │   │   ├── schema/              # Drizzle schema
│   │   │   ├── client.ts            # 数据库连接
│   │   │   ├── enums.ts             # 状态枚举
│   │   │   ├── seed.ts              # 种子数据
│   │   │   └── index.ts             # barrel 导出
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── domain/                      # 业务领域模型
│   │   ├── src/
│   │   │   ├── pipeline/            # 造物流引擎
│   │   │   ├── agents/              # Agent 调用和状态管理
│   │   │   ├── memory/              # 记忆系统
│   │   │   ├── events/              # 事件系统
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                          # 共享 UI 组件
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── openclaw/                    # OpenClaw 集成（已有部分代码）
│   │   ├── src/
│   │   │   ├── gateway/
│   │   │   ├── agent/
│   │   │   ├── workspace/
│   │   │   ├── setup/
│   │   │   ├── tools/               # Agent 数据交互 tool（新建）
│   │   │   ├── constants.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── templates/                   # 模板系统（已有部分代码）
│       ├── src/
│       │   ├── types.ts
│       │   ├── loader.ts
│       │   └── presets/
│       │       └── kaiwu-factory/
│       ├── tsconfig.json
│       └── package.json
│
├── CLAUDE.md                        # 项目级 Claude Code 指令
├── package.json                     # 根 package.json（workspace 配置）
├── pnpm-workspace.yaml              # pnpm workspace 配置
├── turbo.json                       # Turborepo 配置
├── tsconfig.base.json               # 共享 TypeScript 配置
├── .eslintrc.json                   # 根 ESLint 配置（或 oxlint）
├── .prettierrc                      # Prettier 配置（或 oxfmt）
├── .gitignore
├── .env.example                     # 环境变量模板
└── README.md                        # 项目说明
```

## 实现步骤

### Step 1：根配置文件

**package.json**：

```json
{
  "name": "kaiwu",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "dev:site": "turbo dev --filter=@kaiwu/site",
    "build": "turbo build",
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix .",
    "format": "oxfmt .",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.0.0",
    "oxlint": "latest"
  }
}
```

**pnpm-workspace.yaml**：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**turbo.json**：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "persistent": true, "cache": false },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

**tsconfig.base.json**：

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Step 2：各 package 初始化

为每个 package 创建 `package.json` 和 `tsconfig.json`：

| Package | name | 依赖 |
|---|---|---|
| packages/db | @kaiwu/db | drizzle-orm, drizzle-kit, postgres |
| packages/domain | @kaiwu/domain | @kaiwu/db, @kaiwu/openclaw |
| packages/ui | @kaiwu/ui | react, unocss |
| packages/openclaw | @kaiwu/openclaw | @kaiwu/templates |
| packages/templates | @kaiwu/templates | zod |
| apps/site | @kaiwu/site | next, react, @kaiwu/db, @kaiwu/domain, @kaiwu/ui |

每个 package 的 tsconfig.json 继承根配置：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### Step 3：apps/site 初始化

```bash
cd apps/site
pnpm create next-app@latest . --typescript --eslint --app --src-dir
# 然后手动安装 UnoCSS：pnpm add -D unocss @unocss/preset-wind @unocss/preset-icons @unocss/nuxt
```

配置：
- Next.js 16 + React 19
- UnoCSS（preset-wind 兼容 Tailwind 类名）
- App Router
- TypeScript strict mode
- 配置 `@kaiwu/*` 的 workspace 引用

### Step 4：CLAUDE.md 项目指令

创建 `CLAUDE.md`（项目级），内容包含：

- 项目概览（一句话描述）
- 技术栈声明
- 常用命令
- 规范文件索引（指向 .claude/rules/）
- 代码模板索引（指向 .claude/code-design/）
- 核心约束（禁止 any、必须用 cn()、页面 < 80 行等）

### Step 5：代码规范文件

在 `.claude/rules/` 下创建规范文件：

| 文件 | 内容 |
|---|---|
| ts.md | TypeScript 规范（禁止 any、可选链、空值合并、枚举用 as const） |
| code-names.md | 命名规范（文件 kebab-case、组件 PascalCase、常量 SCREAMING_SNAKE） |
| comments.md | 注释规范（公共函数 JSDoc、Why 注释、禁止死代码） |
| style.md | 样式规范（只用 UnoCSS、必须用 cn()、语义 token） |
| pages.md | 页面规范（Server Component 默认、page.tsx < 80 行、searchParams 驱动） |
| api.md | API 规范（Server Action 优先、Zod 校验、函数命名 getXxx/createXxx） |

### Step 6：环境变量

创建 `.env.example`：

```bash
# 数据库
DATABASE_URL=postgresql://...

# OpenClaw
OPENCLAW_DIR=~/.openclaw
OPENCLAW_GATEWAY_HOST=127.0.0.1
OPENCLAW_GATEWAY_PORT=18789

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 7：.gitignore

```gitignore
node_modules/
.next/
dist/
.env
.env.local
*.tsbuildinfo
.turbo/
```

### Step 8：验证

```bash
pnpm install
pnpm typecheck    # 所有 package 类型检查通过
pnpm lint         # lint 通过
pnpm dev:site     # 展示网站可启动
```

## 验收标准

- [ ] `pnpm install` 无报错
- [ ] `pnpm typecheck` 所有 package 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm dev:site` 可启动，浏览器访问 localhost:3000 有页面
- [ ] 各 package 可以互相 import（如 `import { db } from "@kaiwu/db"`）
- [ ] CLAUDE.md 存在且内容完整
- [ ] .claude/rules/ 下有 6 个规范文件
- [ ] .env.example 存在

## 参考文档

- `design/技术架构.md → 模块划分` — 目录结构
- `design/CLAUDE.md`（项目根目录的，之前的版本）— 技术栈、常用命令、核心约束
- `design/.claude/rules/` — 代码规范（ts、命名、注释、样式、页面、API）
