## Why

造物流的输入端——用户提交物帖、投票、物帖按权重排序进入队列。没有物帖提交，造物流就没有原料。这是用户与开物局交互的第一个触点。

需求来源：`design/施工/06-物帖提交/README.md`

依赖的前置模块：`s01-database-schema`（users/keywords/votes 表）、`s05-site-skeleton`（页面框架）

## What Changes

- 实现 GitHub OAuth 登录（OAuth 回调 + session 管理）
- 实现物帖提交 Server Action（Zod 校验 + 每日限制 + 写入 keywords 表）
- 实现投票 Server Action（盖印/留白 + 每人每帖限一票 + 更新票数）
- 实现权重排序算法
- 实现物帖墙页面（物帖池列表 + 提交表单 + 投票按钮 + 筛选）

## Capabilities

### New Capabilities

- `github-auth`: GitHub OAuth 登录 + JWT session 管理
- `keyword-submit`: 物帖提交（校验 + 每日限制 + 重复检测）
- `keyword-vote`: 投票（盖印/留白 + 限一票 + 权重重算）
- `keyword-wall`: 物帖墙页面（列表 + 排序 + 筛选 + 提交表单）

### Modified Capabilities

（无）

## Impact

- 新增 `apps/site/src/app/api/auth/` 下 2 个 route.ts
- 新增 `apps/site/src/app/trends/` 下 actions.ts、queries.ts、4 个组件
- 新增 `apps/site/src/lib/auth.ts`、`weight.ts`
- 修改 `apps/site/src/app/trends/page.tsx`（从占位变为实际页面）
- 依赖 GitHub OAuth App 配置（GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET）
