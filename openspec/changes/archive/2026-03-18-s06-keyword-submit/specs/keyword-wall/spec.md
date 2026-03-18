## ADDED Requirements

### Requirement: 物帖墙页面

`/trends` 页面 SHALL 展示物帖池列表，按权重降序排列。

#### Scenario: 物帖列表
- **WHEN** 访问 /trends
- **THEN** 显示所有 pending 状态的物帖，按权重从高到低排序

#### Scenario: 物帖卡片内容
- **WHEN** 查看单张物帖卡片
- **THEN** 显示：物帖文本、提交理由、投票数（🔴 N · ⚪ N）、投票按钮、提交者头像和名称

---

### Requirement: 物帖卡片使用东方组件

KeywordCard SHALL 基于 PaperCard 组件实现（宣纸卡片风格：双线边框、纸纹质感、左上折角）。投票按钮使用 StampBadge 的视觉风格（盖印时有朱砂印章 stamp 动画）。

#### Scenario: 东方视觉风格
- **WHEN** 渲染物帖卡片
- **THEN** 卡片有宣纸质感（双线边框 + 纸纹 noise + 折角），盖印按钮有朱砂方章风格

---

### Requirement: 筛选功能

物帖墙 SHALL 支持筛选 tabs：全部 / 等待中（pending）/ 正在造（in_pipeline）。使用 URL searchParams 驱动筛选状态。

#### Scenario: 筛选等待中
- **WHEN** 选择"等待中"筛选
- **THEN** 只显示 status=pending 的物帖

#### Scenario: URL 驱动
- **WHEN** URL 为 /trends?status=pending
- **THEN** 筛选 tab 高亮"等待中"，列表只显示 pending 物帖

---

### Requirement: 提交表单

物帖墙页面 SHALL 包含提交表单（需登录后可见）。

#### Scenario: 已登录显示表单
- **WHEN** 已登录用户访问 /trends
- **THEN** 页面顶部显示物帖提交表单（关键词输入 + 理由输入 + 提交按钮）

#### Scenario: 未登录提示登录
- **WHEN** 未登录用户访问 /trends
- **THEN** 提交区域显示"登录后提交你的物帖"+ GitHub 登录按钮
