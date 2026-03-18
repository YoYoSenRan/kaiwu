## ADDED Requirements

### Requirement: 首页横向卷轴动画

首页全景图 SHALL 增加 SVG 微动画：炉火跳动、锤击火星、说话动作。

#### Scenario: 动画效果
- **WHEN** 访问首页
- **THEN** 全景图中有微动画，局中人有状态相关的动作

### Requirement: 过堂回放动画

过堂章节 SHALL 增加动画：气泡逐字显现、局势条动画、裁决印章落下。

#### Scenario: 辩论回放
- **WHEN** 查看造物志的过堂章节
- **THEN** 辩论以动画形式回放，有节奏感

### Requirement: 盖印动画

投票时 SHALL 有印章"啪"的盖下 + 微震动画。

#### Scenario: 投票动画
- **WHEN** 用户点击盖印按钮
- **THEN** 朱砂印章动画 + 微震反馈

### Requirement: 角色立绘

8 个局中人 SHALL 有水墨风格立绘（AI 生成或手绘），用于角色卡片和详情页。

#### Scenario: 立绘展示
- **WHEN** 查看局中人卡片或详情页
- **THEN** 显示该角色的水墨风格立绘
