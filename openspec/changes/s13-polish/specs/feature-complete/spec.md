## ADDED Requirements

### Requirement: 内坊页面

`/behind` 页面 SHALL 展示：物帖旅程动画、角色设计理念、技术架构可视化、统计数据。

#### Scenario: 内坊可访问
- **WHEN** 访问 /behind
- **THEN** 页面展示幕后花絮内容

### Requirement: 关于页面

`/about` 页面 SHALL 展示：项目介绍、技术栈、开源信息。

#### Scenario: 关于可访问
- **WHEN** 访问 /about
- **THEN** 页面展示项目信息

### Requirement: 游商自由活动

Cron #2 SHALL 实际运行，游商执行预采风、趋势监测、复盘验证。

#### Scenario: 预采风
- **WHEN** 物帖池有排队物帖且游商空闲
- **THEN** 游商做轻量级市场扫描，结果写入 keywords.pre_scout_data
