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

---

### Requirement: 登出

`POST /api/auth/logout` SHALL 清除 JWT cookie，重定向到首页。

#### Scenario: 登出成功
- **WHEN** 已登录用户点击退出
- **THEN** JWT cookie 被清除，重定向到 /

---

### Requirement: Navbar 登录区

Navbar 的登录区 slot SHALL 根据登录状态渲染：
- 未登录：显示 Ghost 按钮"登录"，点击跳转 GitHub OAuth
- 已登录：显示用户头像（28x28 圆形），点击展开 Dropdown（@username、我的物帖、退出）。Dropdown 基于 Radix DropdownMenu 实现
