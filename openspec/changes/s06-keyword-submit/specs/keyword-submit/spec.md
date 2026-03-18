## ADDED Requirements

### Requirement: 物帖提交校验

Server Action `submitKeyword` SHALL 校验：
- text：1-20 字，必填
- reason：20-200 字，必填
- 用户必须已登录
- 每日限提交 1 个物帖（检查 users.last_submit_at）

#### Scenario: 提交成功
- **WHEN** 已登录用户提交合法的物帖
- **THEN** keywords 表新增一条记录（status: pending），users.last_submit_at 更新

#### Scenario: 字数不合法
- **WHEN** text 超过 20 字或 reason 不足 20 字
- **THEN** 返回校验错误，不写入数据库

#### Scenario: 每日限制
- **WHEN** 用户今天已提交过物帖
- **THEN** 返回"今天已经提交过了，明天再来"

#### Scenario: 未登录
- **WHEN** 未登录用户尝试提交
- **THEN** 跳转到 GitHub 登录

### Requirement: 重复检测

提交时 SHALL 检查是否已存在相同文本的物帖。

#### Scenario: 重复物帖
- **WHEN** 提交的 text 与已有物帖完全相同
- **THEN** 提示"这个物帖已有人提交，你可以直接投票支持它"

#### Scenario: 已在造物流中
- **WHEN** 提交的 text 对应的物帖已在造物流中或已完成
- **THEN** 提示"这个物帖已经有故事了"并给出链接
