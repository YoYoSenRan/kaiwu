## ADDED Requirements

### Requirement: 投票功能

Server Action `castVote` SHALL 支持盖印（seal）和留白（blank）两种投票。

#### Scenario: 投票成功
- **WHEN** 已登录用户对某物帖投票
- **THEN** votes 表新增记录，keywords 的 seal_votes 或 blank_votes +1，权重重算

#### Scenario: 每人每帖限一票
- **WHEN** 用户对同一物帖再次投票
- **THEN** 返回错误"你已经投过票了"

#### Scenario: 未登录投票
- **WHEN** 未登录用户点击投票按钮
- **THEN** 跳转到 GitHub 登录

### Requirement: 改票功能

Server Action `castVote` SHALL 支持改票：如果用户已投过票，再次投票时更新 stance（seal→blank 或 blank→seal），不能撤票。

#### Scenario: 改票成功
- **WHEN** 已投 seal 的用户再次投票选择 blank
- **THEN** votes 表 stance 更新为 blank，keywords 的 seal_votes -1、blank_votes +1，权重重算

#### Scenario: 不能撤票
- **WHEN** 用户尝试取消投票
- **THEN** 不支持，只能改为另一个选项

### Requirement: 权重排序算法

`weight.ts` 的 `calculateWeight()` SHALL 按以下公式计算：
```
权重 = (seal_votes × 3) + (blank_votes × 2) + max(0, 10 × (1 - days/30)) + submitter_bonus
```
submitter_bonus：github_stars ≥ 100 → 5，≥ 10 → 2，否则 0。

#### Scenario: 权重计算正确
- **WHEN** 物帖有 30🔴盖印 10⚪留白，提交 3 天，提交者 150 stars
- **THEN** 权重 = 90 + 20 + 9 + 5 = 124

#### Scenario: 30 天后时间衰减归零
- **WHEN** 物帖提交超过 30 天
- **THEN** time_decay_bonus = 0
