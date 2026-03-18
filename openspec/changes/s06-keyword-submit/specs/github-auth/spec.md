## ADDED Requirements

### Requirement: GitHub OAuth 登录

SHALL 实现完整的 GitHub OAuth 流程：redirect → GitHub 授权 → callback → 创建/更新 users 记录 → 设置 JWT cookie。

#### Scenario: 首次登录
- **WHEN** 用户点击登录，完成 GitHub 授权
- **THEN** users 表新增一条记录（github_id、username、avatar_url、github_stars、github_created），设置 JWT cookie

#### Scenario: 重复登录
- **WHEN** 已有账号的用户再次登录
- **THEN** 更新 users 表的 avatar_url 等字段，刷新 JWT cookie

### Requirement: Session 管理

SHALL 通过 JWT httpOnly cookie 管理用户会话。`GET /api/auth/session` 返回当前用户信息。

#### Scenario: 已登录
- **WHEN** 请求携带有效 JWT cookie
- **THEN** 返回 { user: { id, username, avatarUrl } }

#### Scenario: 未登录
- **WHEN** 请求无 JWT cookie 或 cookie 过期
- **THEN** 返回 { user: null }
