## ADDED Requirements

### Requirement: 内坊页面

`/behind` 页面 SHALL 展示：物帖旅程动画、角色设计理念、技术架构可视化、统计数据。

#### Scenario: 内坊可访问
- **WHEN** 访问 /behind
- **THEN** 页面展示幕后花絮内容

### Requirement: 关于页面

`/about` 页面 SHALL 展示：项目介绍、为什么做这个、技术栈、开源信息、联系方式（社交链接）。

#### Scenario: 关于可访问
- **WHEN** 访问 /about
- **THEN** 页面展示项目信息

### Requirement: 游商自由活动

Cron #2 SHALL 实际运行，游商执行预采风、趋势监测、复盘验证。

#### Scenario: 预采风
- **WHEN** 物帖池有排队物帖且游商空闲
- **THEN** 游商做轻量级市场扫描，结果写入 keywords.pre_scout_data

#### Scenario: 趋势监测
- **WHEN** 无待预采风物帖
- **THEN** 游商扫描行业热点，生成"游商见闻"发布到内坊板块

#### Scenario: 复盘验证
- **WHEN** 有已上线器物超过 7 天未回访
- **THEN** 游商搜索该器物的市场反馈，补充到复盘数据

### Requirement: 封存阁

物帖墙 SHALL 包含封存阁入口，展示所有被封存的物帖及其封存辞。

#### Scenario: 封存阁可浏览
- **WHEN** 访问封存阁
- **THEN** 显示所有 status=dead 的物帖，每张含封存辞摘要

### Requirement: 名人堂

物帖墙 SHALL 包含名人堂入口，展示从物帖到器物的成功案例。

#### Scenario: 名人堂展示
- **WHEN** 访问名人堂
- **THEN** 显示所有 status=launched 的造物令，含器物截图和访问链接
