## ADDED Requirements

### Requirement: 投票功能

Server Action `castVote` SHALL 支持盖印（seal）和留白（blank）两种投票，采用 upsert 语义统一处理新投票和改票。

#### Scenario: 首次投票
- **WHEN** 已登录用户对某物帖首次投票（选择盖印或留白）
- **THEN** votes 表新增记录，keywords 的 seal_votes 或 blank_votes +1，权重重算

#### Scenario: 改票（stance 不同）
- **WHEN** 已投盖印的用户再次投票选择留白（或反之）
- **THEN** votes 表 stance 更新，keywords 的旧 stance 计数 -1、新 stance 计数 +1，权重重算

#### Scenario: 重复投票（stance 相同）
- **WHEN** 已投盖印的用户再次选择盖印
- **THEN** 返回提示"你已经盖过印了"（或"你已经留过白了"），不做任何变更

#### Scenario: 不能撤票
- **WHEN** 用户尝试取消投票（不选任何 stance）
- **THEN** 不支持撤票，只能改为另一个选项

#### Scenario: 未登录投票
- **WHEN** 未登录用户点击投票按钮
- **THEN** 跳转到 GitHub 登录

---

### Requirement: 投票按钮视觉

VoteButton SHALL 使用开物局东方视觉风格：
- 盖印按钮：StampBadge 风格，朱砂色（🔴），点击时有 stamp 动画（scale 1.3→1）
- 留白按钮：灰白色（⚪），无印章效果
- 已投票状态：对应按钮高亮，另一个变为可改票状态
- 投票数显示：`🔴 47 · ⚪ 23`

---

### Requirement: 投票后前端更新

投票后 SHALL 使用乐观更新（Optimistic UI）：
- 点击后立即更新本地票数和按钮状态
- Server Action 返回后，如果失败则回滚并提示错误
- 不使用 revalidatePath 整页刷新（投票是高频交互，体验优先）

---

### Requirement: 权重排序算法

`weight.ts` 的 `calculateWeight()` SHALL 按以下公式计算：
```
权重 = (sealVotes × 3) + (blankVotes × 2) + max(0, 10 × (1 - daysSinceSubmit / 30)) + submitterBonus
```
submitterBonus：github_stars ≥ 100 → 5，≥ 10 → 2，否则 0。

#### Scenario: 权重计算正确
- **WHEN** 物帖有 30🔴盖印 10⚪留白，提交 3 天，提交者 150 stars
- **THEN** 权重 = 90 + 20 + 9 + 5 = 124

#### Scenario: 30 天后时间衰减归零
- **WHEN** 物帖提交超过 30 天
- **THEN** timeDecayBonus = 0
