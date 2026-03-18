## ADDED Requirements

### Requirement: 物帖墙页面

`/trends` 页面 SHALL 展示物帖池列表，按权重降序排列。

#### Scenario: 物帖列表
- **WHEN** 访问 /trends
- **THEN** 显示所有 pending 状态的物帖，按权重从高到低排序

#### Scenario: 物帖卡片内容
- **WHEN** 查看单张物帖卡片
- **THEN** 显示：物帖文本、提交理由、投票数（🟢 N · 🔴 N）、投票按钮、提交者头像和名称

### Requirement: 筛选功能

物帖墙 SHALL 支持筛选：全部 / 等待中（pending）/ 正在造（in_pipeline）。

#### Scenario: 筛选等待中
- **WHEN** 选择"等待中"筛选
- **THEN** 只显示 status=pending 的物帖

### Requirement: 提交表单

物帖墙页面 SHALL 包含提交表单（需登录后可见）。

#### Scenario: 已登录显示表单
- **WHEN** 已登录用户访问 /trends
- **THEN** 页面顶部显示物帖提交表单（关键词输入 + 理由输入 + 提交按钮）

#### Scenario: 未登录提示登录
- **WHEN** 未登录用户访问 /trends
- **THEN** 提交区域显示"登录后提交你的物帖"+ 登录按钮
