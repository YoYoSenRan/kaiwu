# 05 — 物帖提交

## 目标

用户可以通过 GitHub 登录，提交物帖，投票，物帖按权重排序。完成后物帖墙页面可用。

## 依赖

- 00-数据库（users / keywords / votes 表）
- 04-展示网站骨架（页面框架）

## 文件清单

```
apps/site/src/
├── app/
│   ├── api/auth/
│   │   ├── github/route.ts          # GitHub OAuth 回调
│   │   └── session/route.ts         # 获取当前用户
│   ├── trends/
│   │   ├── page.tsx                 # 物帖墙页面（Server Component）
│   │   ├── actions.ts               # Server Actions（提交物帖、投票）
│   │   ├── queries.ts               # 查询（物帖列表、排序）
│   │   └── components/
│   │       ├── SubmitForm.tsx        # 物帖提交表单
│   │       ├── KeywordCard.tsx       # 物帖卡片（含投票按钮）
│   │       ├── KeywordPool.tsx       # 物帖池列表
│   │       └── VoteButton.tsx        # 盖印/留白按钮
├── lib/
│   ├── auth.ts                      # GitHub OAuth 逻辑
│   └── weight.ts                    # 权重排序算法
```

## 实现步骤

### Step 1：GitHub OAuth

- 注册 GitHub OAuth App
- 实现 OAuth 流程（redirect → callback → 创建/更新 users 记录）
- 实现 session 管理（JWT cookie）

### Step 2：物帖提交

Server Action：`submitKeyword(formData)`
- Zod 校验：text（1-20 字）、reason（20-200 字）
- 检查每日提交限制（last_submit_at）
- 写入 keywords 表（status: pending）
- 计算初始权重

### Step 3：投票

Server Action：`castVote(keywordId, stance)`
- 校验：每人每物帖限一票
- 写入 votes 表
- 更新 keywords 的 green_votes / red_votes
- 重新计算权重

### Step 4：权重排序算法

文件：`src/lib/weight.ts`

```ts
function calculateWeight(keyword: Keyword): number {
  const greenScore = keyword.greenVotes * 3
  const redScore = keyword.redVotes * 2
  const daysSinceSubmit = daysBetween(keyword.createdAt, now())
  const timeDecay = Math.max(0, 10 * (1 - daysSinceSubmit / 30))
  const submitterBonus = keyword.submitterStars >= 100 ? 5 : keyword.submitterStars >= 10 ? 2 : 0
  return greenScore + redScore + timeDecay + submitterBonus
}
```

### Step 5：物帖墙页面

- 物帖池列表（按权重排序）
- 每张物帖卡片：文本、理由、投票数、投票按钮、提交者
- 提交表单（需登录）
- 筛选：全部 / 等待中 / 正在造

## 验收标准

- [ ] GitHub 登录流程正常
- [ ] 可以提交物帖（校验通过）
- [ ] 每日限 1 个物帖的限制生效
- [ ] 可以投票（盖印/留白），每人每物帖限一票
- [ ] 物帖按权重正确排序
- [ ] 未登录用户点击投票/提交时跳转登录

## 参考文档

- `design/用户参与体系.md` — 认证、提交规则、投票机制、权重公式
- `design/界面设计/物帖墙.md` — 页面线框图和样式规格
