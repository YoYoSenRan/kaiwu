## Context

展示网站骨架已就位（s05），数据库表已定义（s01）。本阶段实现用户侧的第一个交互功能：登录、提交物帖、投票。

用户参与体系已在 `design/用户参与体系.md` 中完整定义，包括认证、提交规则、投票机制、权重公式。

## Goals / Non-Goals

**Goals:**

- GitHub OAuth 登录流程完整
- 物帖提交有完整校验（字数、每日限制、重复检测）
- 投票功能正常（盖印/留白、限一票、权重重算）
- 物帖墙页面可用（列表、排序、筛选）

**Non-Goals:**

- 不实现邮箱登录或其他 OAuth 提供商
- 不实现物帖的编辑/删除（提交后不可修改）
- 不实现物帖墙的动画效果（属于打磨阶段）
- 不实现内容审核机制（敏感词过滤 + AI 审核 + 举报），属于打磨阶段

## Decisions

### D1: Session 管理 — JWT Cookie

不引入 NextAuth 等重型库。直接用 JWT 存在 httpOnly cookie 中，轻量够用。JWT payload 含 userId + githubId + username。

### D2: Server Actions 优先

物帖提交和投票用 Next.js Server Actions，不走 Route Handler。表单提交更自然，progressive enhancement 友好。

### D3: 权重公式

严格按 `用户参与体系.md` 实现：
```
权重 = (seal_votes × 3) + (blank_votes × 2) + time_decay_bonus + submitter_bonus
```
留白票也是正向加分——争议本身就是看点。

### D4: 重复检测 — 简单文本匹配

MVP 阶段用简单的文本相似度检测（完全相同或包含关系）。不引入向量搜索。

## Risks / Trade-offs

- **GitHub OAuth 依赖**：需要注册 GitHub OAuth App，本地开发需要配置回调 URL。→ .env.example 中已有占位。
- **权重实时性**：每次投票都重算权重，高并发时可能有性能问题。→ MVP 阶段不考虑，物帖量不大。
