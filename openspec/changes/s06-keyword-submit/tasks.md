## 1. GitHub OAuth

- [x] 1.1 创建 `apps/site/src/lib/auth.ts`：GitHub OAuth 逻辑（redirect URL 生成、token 交换、用户信息获取、JWT 签发/验证）— 验收：可生成登录 URL 和验证 JWT
- [x] 1.2 实现 `apps/site/src/app/api/auth/github/route.ts`：GET 处理 OAuth 回调（code → token → 用户信息 → upsert users → 设置 JWT cookie → 重定向回来源页）— 验收：GitHub 授权后跳转回网站并登录
- [x] 1.3 实现 `apps/site/src/app/api/auth/session/route.ts`：GET 返回当前用户信息 — 验收：已登录返回 user，未登录返回 null
- [x] 1.4 实现 `apps/site/src/app/api/auth/logout/route.ts`：POST 清除 JWT cookie，重定向到 / — 验收：退出后 session 返回 null
- [x] 1.5 实现 `apps/site/src/components/layout/UserMenu.tsx`：Navbar 登录区（未登录→Ghost 按钮"登录"；已登录→头像 28x28 + Radix DropdownMenu：@username、我的物帖、退出）— 验收：登录状态正确切换
- [x] 1.6 修改 `Navbar.tsx`：将登录区 slot 替换为 UserMenu 组件 — 验收：Navbar 显示登录/头像

## 2. 物帖提交

- [x] 2.1 创建 `apps/site/src/app/trends/actions.ts`：submitKeyword Server Action（Zod 校验：text 1-20 字 + reason 20-200 字 + 登录校验 + 每日限制 + GitHub 账号年龄 > 30 天 + 重复检测 + 写入 keywords）— 验收：合法提交写入成功，非法提交返回错误
- [x] 2.2 创建 `apps/site/src/app/trends/components/SubmitForm.tsx`：提交表单组件（关键词 + 理由 + 提交按钮，未登录显示"登录后提交你的物帖"+ GitHub 登录按钮）— 验收：表单可提交，校验错误有提示

## 3. 投票

- [x] 3.1 在 `actions.ts` 中添加 castVote Server Action（upsert 语义：没投过→新建，stance 不同→改票，stance 相同→提示已投，不能撤票；更新 seal_votes/blank_votes + 重算权重）— 验收：新投票/改票/重复投票均正确处理
- [x] 3.2 创建 `apps/site/src/app/trends/components/VoteButton.tsx`：盖印/留白按钮（StampBadge 朱砂风格 + stamp 动画 + 乐观更新 useOptimistic + 未登录跳转 + 已投票状态高亮）。投票数显示 🔴 N · ⚪ N — 验收：点击即时更新，失败回滚

## 4. 权重排序

- [x] 4.1 创建 `apps/site/src/lib/weight.ts`：calculateWeight()（sealVotes×3 + blankVotes×2 + max(0, 10×(1-daysSinceSubmit/30)) + submitterBonus）— 验收：示例数据 30🔴10⚪ 3天 150stars = 124

## 5. 物帖墙页面

- [x] 5.1 创建 `apps/site/src/app/trends/queries.ts`：查询物帖列表（按权重排序 + 按 status 筛选 + 关联提交者信息 + 当前用户投票状态）— 验收：返回正确排序的物帖，含投票状态
- [x] 5.2 创建 `apps/site/src/app/trends/components/KeywordCard.tsx`：基于 PaperCard 的物帖卡片（物帖文本 + 理由 + VoteButton + 提交者头像/名称）— 验收：卡片有宣纸质感，信息完整
- [x] 5.3 创建 `apps/site/src/app/trends/components/KeywordPool.tsx`：物帖池列表（卡片列表 + 筛选 tabs：全部/等待中/正在造，URL searchParams 驱动）— 验收：筛选切换正常，URL 同步
- [x] 5.4 更新 `apps/site/src/app/trends/page.tsx`：组装 SubmitForm + KeywordPool，Server Component 查询数据 — 验收：页面完整可用

## 6. 验证

- [x] 6.1 手动验证 GitHub 登录 → 提交物帖 → 投票 → 改票全流程
- [x] 6.2 验证每日提交限制 + 重复检测 + 账号年龄校验
- [x] 6.3 验证投票 upsert（新投票/改票/重复投票）+ 权重更新
- [x] 6.4 验证物帖卡片东方视觉风格（PaperCard + StampBadge）
- [x] 6.5 `pnpm typecheck` 通过
- [x] 6.6 `pnpm lint` 通过
