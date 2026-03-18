## ADDED Requirements

### Requirement: 造物志列表

`/stories` 页面 SHALL 展示所有造物令的卡片，按 created_at 降序。

卡片 SHALL 包含：物帖文本、状态标签、进度条（6 阶段）、提交者。

#### Scenario: 卡片视觉区分
- **WHEN** 查看造物志列表
- **THEN** 已开物卡片明亮，正在造卡片有脉冲动画，封存卡片低饱和度

### Requirement: 筛选功能

SHALL 支持筛选：全部 / 正在造 / 已开物 / 封存。

#### Scenario: 筛选封存
- **WHEN** 选择"封存"筛选
- **THEN** 只显示 status=dead 的造物令
