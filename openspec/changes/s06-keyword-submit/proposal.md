## Why

造物流的输入端——用户提交物帖、投票、物帖按权重排序进入队列。没有物帖提交，造物流就没有原料。这是用户与开物局交互的第一个触点。

需求来源：`design/施工/06-物帖提交/README.md`

依赖的前置模块：`s01-database-schema`（users/keywords/votes 表）、`s05-site-skeleton`（页面框架）

## What Changes

- 实现 GitHub OAuth 登录（OAuth 回调 + session 管理 + 登出 + Navbar 登录区）
- 实现物帖提交 Server Action（Zod 校验 + 每日限制 + 写入 keywords 表）
- 实现投票 Server Action（盖印/留白 + upsert 语义改票 + 乐观更新 + 权重重算）
- 实现权重排序算法
- 实现物帖墙页面（PaperCard 物帖卡片 + StampBadge 投票 + 提交表单 + URL 筛选）

## Capabilities

### New Capabilities

- `github-auth`: GitHub OAuth 登录 + JWT session 管理 + 登出 + Navbar 登录区
- `keyword-submit`: 物帖提交（校验 + 每日限制 + 重复检测）
- `keyword-vote`: 投票（盖印/留白 + upsert 改票 + 乐观更新 + 权重排序）
- `keyword-wall`: 物帖墙页面（PaperCard 卡片 + URL 筛选 + 提交表单）

### Modified Capabilities

（无）

## Impact

- 新增 `apps/site/src/app/api/auth/` 下 3 个 route.ts（github 回调、session、logout）
- 新增 `apps/site/src/app/trends/` 下 actions.ts、queries.ts、4 个组件
- 新增 `apps/site/src/lib/auth.ts`、`weight.ts`
- 新增 `apps/site/src/components/layout/UserMenu.tsx`（Navbar 登录区）
- 修改 `apps/site/src/app/trends/page.tsx`（从占位变为实际页面）
- 修改 `apps/site/src/components/layout/Navbar.tsx`（填充登录区 slot）
- 依赖 GitHub OAuth App 配置（GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET）
