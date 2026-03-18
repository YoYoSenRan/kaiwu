## 1. GitHub OAuth

- [ ] 1.1 创建 `apps/site/src/lib/auth.ts`：GitHub OAuth 逻辑（redirect URL 生成、token 交换、用户信息获取、JWT 签发/验证）— 验收：可生成登录 URL 和验证 JWT
- [ ] 1.2 实现 `apps/site/src/app/api/auth/github/route.ts`：OAuth 回调（code → token → 用户信息 → upsert users → 设置 cookie）— 验收：GitHub 授权后跳转回网站并登录
- [ ] 1.3 实现 `apps/site/src/app/api/auth/session/route.ts`：返回当前用户信息 — 验收：已登录返回 user，未登录返回 null

## 2. 物帖提交

- [ ] 2.1 创建 `apps/site/src/app/trends/actions.ts`：submitKeyword Server Action（Zod 校验 + 每日限制 + 重复检测 + 写入 keywords）— 验收：合法提交写入成功，非法提交返回错误
- [ ] 2.2 创建 `apps/site/src/app/trends/components/SubmitForm.tsx`：提交表单组件（关键词 + 理由 + 提交按钮，未登录显示登录提示）— 验收：表单可提交，校验错误有提示

## 3. 投票

- [ ] 3.1 在 `actions.ts` 中添加 castVote Server Action（stance 校验 + 限一票 + 更新票数 + 重算权重）— 验收：投票成功更新票数，重复投票返回错误
- [ ] 3.2 创建 `apps/site/src/app/trends/components/VoteButton.tsx`：盖印/留白按钮（已投票状态 + 未登录跳转）— 验收：按钮状态正确，投票后即时更新

## 4. 权重排序

- [ ] 4.1 创建 `apps/site/src/lib/weight.ts`：calculateWeight()（green×3 + red×2 + timeDecay + submitterBonus）— 验收：示例数据计算结果与设计文档一致

## 5. 物帖墙页面

- [ ] 5.1 创建 `apps/site/src/app/trends/queries.ts`：查询物帖列表（按权重排序 + 筛选）— 验收：返回正确排序的物帖
- [ ] 5.2 创建 `apps/site/src/app/trends/components/KeywordCard.tsx`：物帖卡片（文本 + 理由 + 票数 + 投票按钮 + 提交者）— 验收：卡片信息完整
- [ ] 5.3 创建 `apps/site/src/app/trends/components/KeywordPool.tsx`：物帖池列表（卡片列表 + 筛选 tabs）— 验收：筛选切换正常
- [ ] 5.4 更新 `apps/site/src/app/trends/page.tsx`：组装提交表单 + 物帖池 — 验收：页面完整可用

## 6. 验证

- [ ] 6.1 GitHub 登录流程端到端测试
- [ ] 6.2 物帖提交 + 每日限制 + 重复检测测试
- [ ] 6.3 投票 + 限一票 + 权重更新测试
- [ ] 6.4 `pnpm typecheck` 通过
